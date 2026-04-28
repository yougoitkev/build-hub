import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { PremiumCard, PremiumCardContent, PremiumCardHeader, PremiumCardTitle } from "@/components/learning/PremiumCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Star, Send, MessageSquareHeart, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/data/api";

const buildTrainerName = (trainer) =>
  trainer?.name ||
  `${trainer?.first_name || trainer?.firstName || ""} ${trainer?.last_name || trainer?.lastName || ""}`.trim() ||
  trainer?.portalid ||
  "Trainer";

const mapTrainer = (trainer) => ({
  id: String(trainer.id),
  name: buildTrainerName(trainer),
});

const mapFeedback = (entry) => ({
  id: String(entry.id),
  trainerId: String(entry.trainer_id),
  trainerName: entry.trainer_name || "Trainer",
  fromUserName: entry.anonymous ? "Anonymous" : entry.from_user_name || "Unknown",
  rating: Number(entry.rating || 0),
  category: entry.category || "General",
  text: entry.text || "",
  date: entry.submitted_at ? new Date(entry.submitted_at).toLocaleDateString() : "",
  anonymous: Boolean(entry.anonymous),
});

export default function FeedbackPage() {
  const user = useAppStore((s) => s.user);

  const [trainers, setTrainers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [options, setOptions] = useState({ feedbackCategories: [] });
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [filterTrainer, setFilterTrainer] = useState("all");
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("");
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTrainers = async () => {
      try {
        if (isMounted) {
          setIsLoadingData(true);
          setFetchError(false);
        }

        const [optionsResponse, response] = await Promise.all([
          api.options.get(),
          api.trainers.list(),
        ]);
        const trainerRows = Array.isArray(response?.trainers)
          ? response.trainers.map(mapTrainer)
          : Array.isArray(response)
            ? response.map(mapTrainer)
            : [];

        if (!isMounted) {
          return;
        }

        setOptions({
          feedbackCategories: Array.isArray(optionsResponse?.feedbackCategories) ? optionsResponse.feedbackCategories : [],
        });
        setTrainers(trainerRows);
      } catch (error) {
        if (isMounted) {
          setTrainers([]);
          setFetchError(true);
        }
        toast.error(error?.message || "Failed to load trainers.");
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    loadTrainers();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadFeedback = async () => {
      try {
        if (isMounted) {
          setFetchError(false);
        }

        const response = await api.feedback.list(filterTrainer === "all" ? {} : { trainer_id: filterTrainer });
        const rows = Array.isArray(response?.feedback) ? response.feedback.map(mapFeedback) : [];

        if (!isMounted) {
          return;
        }

        setFeedback(rows);
      } catch (error) {
        if (isMounted) {
          setFeedback([]);
          setFetchError(true);
        }
        toast.error(error?.message || "Failed to load feedback.");
      }
    };

    if (!isLoadingData) {
      loadFeedback();
    }

    return () => {
      isMounted = false;
    };
  }, [filterTrainer, isLoadingData]);

  const filteredFeedback = useMemo(
    () => feedback.filter((entry) => filterTrainer === "all" || entry.trainerId === filterTrainer),
    [feedback, filterTrainer]
  );

  const handleSubmit = async () => {
    if (!selectedTrainer || !rating || !category) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.feedback.create({
        trainer_id: Number(selectedTrainer),
        from_user_id: user?.portalId || user?.id,
        from_user_name: anonymous ? "Anonymous" : user?.name || "User",
        rating,
        category,
        text,
        anonymous,
      });

      toast.success("Feedback submitted successfully");
      setSelectedTrainer("");
      setRating(0);
      setCategory("");
      setText("");
      setAnonymous(false);

      const response = await api.feedback.list(filterTrainer === "all" ? {} : { trainer_id: filterTrainer });
      const rows = Array.isArray(response?.feedback) ? response.feedback.map(mapFeedback) : [];
      setFeedback(rows);
    } catch (error) {
      toast.error(error?.message || "Failed to submit feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      <PageHeader
        icon={MessageSquareHeart}
        eyebrow="Voice Of Learner"
        title="Trainer Feedback"
        description="Submit your evaluations and view historical feedback for trainers."
      />

      {isLoadingData && <p className="text-sm text-muted-foreground">Loading data...</p>}
      {!isLoadingData && fetchError && <p className="text-sm text-destructive">Error in fetching data</p>}

      {!isLoadingData && (
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <PremiumCard>
              <PremiumCardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                <PremiumCardTitle className="text-lg">Submit Feedback</PremiumCardTitle>
              </PremiumCardHeader>
              <PremiumCardContent className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-bold text-foreground/80 mb-2 block">Select Trainer</Label>
                    <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
                      <SelectTrigger className="h-12 bg-background border-border/50 rounded-xl"><SelectValue placeholder="Choose a trainer..." /></SelectTrigger>
                      <SelectContent>
                        {trainers.map((trainer) => <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 rounded-xl border border-border/50 bg-muted/10">
                    <Label className="text-sm font-bold text-foreground/80 mb-3 block">Overall Rating</Label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className="p-1 hover:scale-110 active:scale-95 transition-transform"
                          aria-label={`Rate ${star} stars`}
                        >
                          <Star className={`h-8 w-8 ${star <= rating ? "fill-warning text-warning drop-shadow-sm" : "text-border/80 hover:text-warning/50"} transition-colors`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-foreground/80 mb-2 block">Feedback Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12 bg-background border-border/50 rounded-xl"><SelectValue placeholder="What is this regarding?" /></SelectTrigger>
                      <SelectContent>
                        {options.feedbackCategories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-bold text-foreground/80 mb-2 block">Detailed Comments</Label>
                    <Textarea
                      value={text}
                      onChange={(event) => setText(event.target.value)}
                      placeholder="Please share specific observations and actionable feedback..."
                      rows={5}
                      maxLength={1000}
                      className="resize-none bg-background border-border/50 rounded-xl p-3 focus-visible:ring-1"
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-right">{text.length} / 1000</p>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50">
                    <Checkbox id="anonymous" checked={anonymous} onCheckedChange={(value) => setAnonymous(!!value)} className="rounded-md" />
                    <Label htmlFor="anonymous" className="text-sm font-medium cursor-pointer flex-1">Submit this feedback anonymously</Label>
                  </div>
                </div>

                <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full h-12 rounded-xl font-bold text-base shadow-sm">
                  <Send className="h-4 w-4 mr-2" /> Submit Evaluation
                </Button>
              </PremiumCardContent>
            </PremiumCard>
          </div>

          <div className="lg:col-span-3">
            <PremiumCard className="h-full">
              <PremiumCardHeader className="bg-muted/20 border-b border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <PremiumCardTitle className="text-lg">Feedback History</PremiumCardTitle>
                  <Select value={filterTrainer} onValueChange={setFilterTrainer}>
                    <SelectTrigger className="w-full sm:w-[220px] h-10 bg-background border-border/50 rounded-lg"><SelectValue placeholder="Filter by Trainer" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Every Trainer</SelectItem>
                      {trainers.map((trainer) => <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </PremiumCardHeader>
              <PremiumCardContent className="p-6">
                <div className="space-y-4">
                  {filteredFeedback.length === 0 && (
                    <div className="text-center py-16 text-muted-foreground bg-muted/5 border-2 border-dashed border-border/50 rounded-xl">
                      <MessageSquareHeart className="h-10 w-10 mx-auto opacity-20 mb-3" />
                      <p className="font-bold text-base text-foreground mb-1">No Feedback Found</p>
                      <p className="text-sm">There are no feedback records matching your current filter.</p>
                    </div>
                  )}
                  {filteredFeedback.map((entry) => (
                    <div key={entry.id} className="p-5 rounded-xl border border-border/50 bg-card hover:border-primary/20 transition-colors shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-border/50">
                        <div>
                          <p className="font-bold text-base text-foreground leading-none">{entry.trainerName}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-2">
                            <div className="flex">
                              {Array.from({ length: 5 }, (_, index) => (
                                <Star key={index} className={`h-4 w-4 ${index < entry.rating ? "fill-warning text-warning" : "text-border/80"}`} />
                              ))}
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider bg-muted text-muted-foreground px-2 py-0.5 rounded-md border border-border/50">{entry.category}</span>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">{entry.date}</span>
                      </div>
                      <p className="text-sm text-foreground/90 leading-relaxed mb-4">{entry.text}</p>
                      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border/50">
                        <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground">Submitted by {entry.fromUserName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </PremiumCardContent>
            </PremiumCard>
          </div>
        </div>
      )}
    </div>
  );
}
