import { useEffect, useState } from "react";
import { PremiumCard, PremiumCardContent } from "@/components/learning/PremiumCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { Plus, Search, Download, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/data/api";

export default function StudentsPage() {
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [remoteStudents, setRemoteStudents] = useState([]);
  const [options, setOptions] = useState({ statuses: [], levels: [] });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  const mapStudentRecord = (student) => {
    const locationDisplay = student.location_display || student.location || "";
    const locationMatch = /^(.+?)\s*\((.+)\)$/.exec(locationDisplay);

    return ({
    id: String(student.id ?? student.emp_id ?? student.empId ?? student.portalid ?? student.portal_id ?? Date.now()),
    portalId: student.see_details_portalid || student.portalid || student.portal_id || student.portalId || student.emp_id || student.empId || "",
    source: student.source || "",
    lastName: student.last_name || student.lastName || student.learner_name?.split(" ").slice(1).join(" ") || "",
    firstName: student.first_name || student.firstName || student.learner_name?.split(" ")[0] || "",
    location: locationMatch ? locationMatch[1].trim() : locationDisplay,
    wfh: student.wfh || (locationMatch ? locationMatch[2].trim() : "No"),
    status: student.status || "Active",
    level1: student.level_1 || student.level1 || "Not Started",
    level2: student.level_2 || student.level2 || "Not Started",
    level3: student.level_3 || student.level3 || "Not Started",
    roleAssignment: student.role_assignment || student.roleAssignment || "",
    billing: student.billing || "",
    tl: student.tl_name || student.tl || "",
    language: student.language || "",
    empId: student.emp_id || student.empId || student.portalid || student.portal_id || "",
    windows: student.windows || "",
    nttBpoEmail: student.ntt_bpo_email || student.nttBpoEmail || "",
    pcbReq: student.pcb_req || student.pcbReq || "",
    homePhone: student.home_phone || student.homePhone || "",
    homeEmail: student.home_email || student.homeEmail || "",
    tsys: student.tsys || "",
    macGui: student.mac_gui || student.macGui || "",
    ice: student.ice || "",
    genesys: student.genesys || "",
    notes: student.notes || "",
    trainerId: String(student.trainer_id || student.trainerId || ""),
    createdAt: student.created_at || student.createdAt || "",
    updatedAt: student.updated_at || student.updatedAt || "",
    lastModifiedBy: student.last_modified_by || student.lastModifiedBy || "",
    });
  };

  useEffect(() => {
    let isMounted = true;

    const loadStudents = async () => {
      try {
        if (isMounted) {
          setIsLoadingData(true);
          setFetchError(false);
        }
        const [optionsResponse, studentsResponse] = await Promise.all([
          api.options.get(),
          api.studentsPage.list(),
        ]);
        const studentListSource = Array.isArray(studentsResponse?.students)
          ? studentsResponse.students
          : Array.isArray(studentsResponse)
            ? studentsResponse
            : [];

        if (isMounted) {
          setOptions({
            statuses: Array.isArray(optionsResponse?.statuses) ? optionsResponse.statuses : [],
            levels: Array.isArray(optionsResponse?.levels) ? optionsResponse.levels : [],
          });
          setRemoteStudents(studentListSource.map(mapStudentRecord));
          setIsLoadingData(false);
        }
      } catch (error) {
        if (isMounted) {
          setRemoteStudents([]);
          setFetchError(true);
          setIsLoadingData(false);
        }
        toast.error(error?.message || "Failed to load learners.");
      }
    };

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, []);

  const displayedStudents = remoteStudents;

  const filtered = displayedStudents.filter((s) => {
    const matchSearch =
      `${s.firstName} ${s.lastName} ${s.empId} ${s.location}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const matchLevel = levelFilter === "all" || s.level1 === levelFilter;
    return matchSearch && matchStatus && matchLevel;
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Learner Directory
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{displayedStudents.length} total active learners across all cohorts</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <Button variant="outline" className="h-11 rounded-full border-border/50">
            <Download className="h-4 w-4 mr-2" />Export Roster
          </Button>
          <Link to="/students/new">
            <Button className="h-11 rounded-full">
              <Plus className="h-4 w-4 mr-2" />Add Learner
            </Button>
          </Link>
        </div>
      </div>

      {isLoadingData && (
        <p className="text-sm text-muted-foreground">Loading data...</p>
      )}
      {!isLoadingData && fetchError && (
        <p className="text-sm text-destructive">Error in fetching data</p>
      )}

      {!isLoadingData && !fetchError && (
        <PremiumCard className="overflow-hidden">
        <PremiumCardContent className="p-4 sm:p-6 bg-muted/10 border-b border-border/50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
              <Input placeholder="Search students by name, ID, or location..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-12 bg-background border-border/50 rounded-xl" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-12 bg-background border-border/50 rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {options.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-12 bg-background border-border/50 rounded-xl"><SelectValue placeholder="Level 1" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {options.levels.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </PremiumCardContent>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap" role="table">
            <thead>
              <tr className="bg-muted/30 border-b border-border/50 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="py-4 px-6">Learner Name</th>
                <th className="py-4 px-6">Emp ID</th>
                <th className="py-4 px-6">Location</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Level 1</th>
                <th className="py-4 px-6">Level 2</th>
                <th className="py-4 px-6">Language</th>
                <th className="py-4 px-6 sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filtered.map((student) => (
                <tr key={student.id} className="hover:bg-muted/10 transition-colors group">
                  <td className="py-4 px-6">
                    <Link to={`/students/${student.portalId || student.id}`} className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        {student.firstName[0]}{student.lastName[0]}
                      </div>
                      {student.firstName} {student.lastName}
                    </Link>
                  </td>
                  <td className="py-4 px-6 text-muted-foreground font-mono text-xs font-semibold">{student.empId}</td>
                  <td className="py-4 px-6 font-medium text-foreground">{student.location} <span className="text-muted-foreground text-xs font-normal">({student.wfh})</span></td>
                  <td className="py-4 px-6"><StatusBadge status={student.status} /></td>
                  <td className="py-4 px-6"><StatusBadge status={student.level1} /></td>
                  <td className="py-4 px-6"><StatusBadge status={student.level2} /></td>
                  <td className="py-4 px-6 text-muted-foreground font-medium">{student.language}</td>
                  <td className="py-4 px-6 text-right">
                    <Link to={`/students/${student.portalId || student.id}`}>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        View Profile
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 px-6 text-center text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="font-bold text-base text-foreground mb-1">No Learners Found</p>
                    <p className="text-sm">We couldn't find any learners matching your criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </PremiumCard>
      )}
    </div>
  );
}
