import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight, BarChart3, BookOpen, Check, ChevronDown, ChevronRight,
  CircleUserRound, Clock3, Code2, Database, FileText, Home, Lightbulb,
  LogOut, Mail, Menu, MessageSquare, Phone, Play, Search, Send, Settings2,
  ShieldCheck, Sparkles, Target, Upload, User, X, Eye, EyeOff, Building2,
  ClipboardList, BrainCircuit, Mic, Trophy, Download, Share2, LockKeyhole
} from "lucide-react";
import { EMPTY_APP_DATA } from "./data";
import { generateQuestions, getDashboard, getReport, isBackendConfigured, loginUser, registerUser, scoreAnswer, uploadResume } from "./api";
import "./styles.css";

const UserContext = React.createContext({ name: "", email: "", phone: "" });
const DataContext = React.createContext(EMPTY_APP_DATA);
const useUser = () => React.useContext(UserContext);
const useAppData = () => React.useContext(DataContext);

const COLORS = { navy:"#1A3263", blue:"#547792", cream:"#EFD2B0", yellow:"#FFC570" };

function Logo({ compact=false }) {
  return <div className={`brand ${compact ? "compact" : ""}`}>
    <div className="leaf-logo" aria-hidden="true"><span/><span/><span/></div>
    {!compact && <span>CareerSage</span>}
  </div>
}

function Glass({children, className=""}) { return <section className={`glass ${className}`}>{children}</section> }

function ProgressRing({value, label="/ 100", size=118}) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return <div className="ring" style={{"--p":`${safe}%`, width:size, height:size}}>
    <div className="ring-inner"><strong>{value == null ? "—" : value}%</strong><span>{label}</span></div>
  </div>
}

function Sidebar({page, setPage}) {
  const items = [
    ["home","Home",Home], ["resume","Resume",FileText], ["preparation","Preparation",Target],
    ["interview","Interview",MessageSquare], ["progress","Progress",BarChart3]
  ];
  return <aside className="sidebar">
    <Logo />
    <nav>
      {items.map(([id,label,Icon]) => <button key={id} className={page===id ? "active":""} onClick={()=>setPage(id)}>
        <Icon size={21}/><span>{label}</span>
      </button>)}
    </nav>
    <div className="side-bottom">
      <button onClick={()=>setPage("profile")}><User size={20}/>Profile</button>
      <button onClick={()=>setPage("landing")}><LogOut size={20}/>Logout</button>
    </div>
  </aside>
}

function UserPill() {
  const user = useUser();
  return <div className="user-pill"><CircleUserRound size={22}/><span>{user.name || "Account"}</span><ChevronDown size={16}/></div>
}

function AppShell({page,setPage,children}) {
  return <div className="app-shell">
    <Sidebar page={page} setPage={setPage}/>
    <main className="workspace">
      <div className="workspace-top"><UserPill/></div>
      {children}
    </main>
  </div>
}

function Landing({go}) {
  return <div className="public-page landing">
    <header className="public-nav"><Logo/><div className="nav-links"><a href="#about">About</a><a href="#features">Features</a><a href="#contact">Contact</a><button onClick={go}>Get Started <ArrowRight size={17}/></button></div></header>
    <div className="landing-orb orb-a"/><div className="landing-orb orb-b"/>
    <Glass className="landing-card">
      <Logo/>
      <h1>Know where you stand.<br/>Know what to do next.</h1>
      <p>Insights, guidance and practice —<br/>all in one place.</p>
      <button className="primary big" onClick={go}>Get Started <ArrowRight/></button>
    </Glass>
  </div>
}

function Login({go}) {
  const [form,setForm] = useState({name:"",email:"",phone:"",password:""});
  const [mode,setMode]=useState("login");
  const [show,setShow]=useState(false);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const update=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=async()=>{
    setError(""); setBusy(true);
    try { await go(mode,form); }
    catch(e) {
      if(e.code === "ACCOUNT_EXISTS") setError("This email is already registered. Switch to Log in.");
      else if(e.code === "INVALID_CREDENTIALS") setError("Email or password is incorrect. If you are new, create an account.");
      else setError(e.message || "Could not connect to the backend.");
    }
    finally { setBusy(false); }
  };
  return <div className="public-page login-page">
    <div className="login-deco deco-1"/><div className="login-deco deco-2"/>
    <div className="login-left">
      <Logo/>
      <blockquote>“Careers aren’t a destination,<br/>they’re a journey.<br/>Let’s build yours together.”</blockquote>
      <div className="sticky">Think of us like a<br/>senior you can<br/>always ask. ♡</div>
    </div>
    <Glass className="login-card">
      <Logo/>
      <h1>{mode === "login" ? "Log in to CareerSage" : "Create your account"}</h1>
      <p>{mode === "login" ? "Welcome back. Sign in to continue." : "Register to get started with your career preparation."}</p>
      {mode === "register" && <label className="field"><User size={21}/><span><b>Full Name</b><input autoComplete="name" value={form.name} onChange={e=>update("name",e.target.value)} placeholder="Enter your name"/></span></label>}
      {mode === "register" && <label className="field"><Phone size={21}/><span><b>Phone Number</b><input autoComplete="tel" value={form.phone} onChange={e=>update("phone",e.target.value)} placeholder="+91 | Enter your phone number"/></span></label>}
      <label className="field"><Mail size={21}/><span><b>Email Address</b><input type="email" autoComplete="email" value={form.email} onChange={e=>update("email",e.target.value)} placeholder="Enter your email address"/></span></label>
      <label className="field"><LockKeyhole size={21}/><span><b>Password</b><input type={show?"text":"password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={e=>update("password",e.target.value)} placeholder={mode === "login" ? "Enter your password" : "Create a password"}/></span><button type="button" className="icon-btn" aria-label={show ? "Hide password" : "Show password"} onClick={()=>setShow(!show)}>{show?<EyeOff size={20}/>:<Eye size={20}/>}</button></label>
      <button className="primary wide" disabled={busy || !form.email.trim() || !form.password.trim() || (mode === "register" && !form.name.trim())} onClick={submit}>{busy ? (mode === "login" ? "Logging in…" : "Creating account…") : (mode === "login" ? "Log in" : "Create account")} <ArrowRight/></button>
      {error && <div className="empty-inline" role="alert">{error}</div>}
      <small>{mode === "login" ? "New to CareerSage? " : "Already registered? "}<button type="button" className="auth-switch" onClick={()=>{setMode(mode === "login" ? "register" : "login");setError("");}}>{mode === "login" ? "Create an account" : "Log in"}</button></small>
    </Glass>
  </div>
}

function ResumeUpload({setPage,onAnalyze}) {
  const user = useUser();
  const [file,setFile]=useState(null);
  const [targetRole,setTargetRole]=useState("Software Engineer");
  const inputRef=useRef();
  const choose=e=>{const f=e.target.files?.[0]; if(f){setFile(f);}};
  const drop=e=>{e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(f)setFile(f)};
  return <AppShell page="home" setPage={setPage}>
    <PageTitle title={`Good to see you, ${(user.name || "there").split(" ")[0]} 👋`} subtitle="Let’s get started with your resume."/>
    <Glass className="upload-card">
      <FileText size={62} strokeWidth={1.6}/>
      <h2>Upload your resume</h2>
      <p>Drop your file here or click to browse</p>
      <label className="field"><Target size={20}/><span><b>Target role</b><select value={targetRole} onChange={e=>setTargetRole(e.target.value)}><option>Software Engineer</option><option>Data Analyst</option><option>Machine Learning Engineer</option><option>Web Developer</option></select></span></label>
      <div className="dropzone" onDragOver={e=>e.preventDefault()} onDrop={drop} onClick={()=>inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept=".pdf,.docx" onChange={choose} hidden/>
        {file ? <><Check className="success-icon"/><b>{file.name}</b><span>{(file.size/1024/1024).toFixed(2)} MB</span></> :
        <><button className="primary">Browse Files</button><span>PDF • DOCX (Max 10MB)</span></>}
      </div>
      <div className="sample-link"><Lightbulb size={17}/> Upload your own resume to generate personalized insights.</div>
      {file && <button className="primary wide" onClick={()=>onAnalyze(file,targetRole)}>Analyze Resume <ArrowRight/></button>}
    </Glass>
  </AppShell>
}

function PageTitle({title,subtitle,action}) {
  return <div className="page-title"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>
}

function Analyzing({setPage,error,returnPage="upload"}) {
  const steps=["Resume uploaded","Waiting for backend analysis","Skills and role insights will appear here","Personalized recommendations will appear here"];
  return <AppShell page="resume" setPage={setPage}>
    <PageTitle title="Analyzing your resume..." subtitle="Your resume has been selected. The backend will process it and return your personalized insights."/>
    <Glass className="analysis-card">
      <div className="steps">{steps.map((s,i)=><div className={i===0?"done":i===1?"current":""} key={s}><span>{i===0?<Check size={16}/>:i+1}</span><label>{s}</label></div>)}</div>
      <ProgressRing value={null} label=""/>
      <div className="empty-inline">{error || "Your resume is being processed. This may take a little while."}</div>
      <button className="secondary" onClick={()=>setPage(returnPage)}>{returnPage === "resume" ? "Back to Resume Analysis" : "Back to Resume Upload"}</button>
    </Glass>
    <div className="time-note"><Clock3 size={20}/> No analysis is shown here. Real results will come from your backend. <Sparkles size={18}/></div>
  </AppShell>
}

function Done({setPage}) {
  return <AppShell page="resume" setPage={setPage}>
    <div className="done-wrap"><Glass className="done-card"><div className="done-check"><Check size={55}/></div><h1>Your resume is analyzed!</h1><p>I’ve gone through your resume and prepared your personalized career dashboard.</p><button className="primary big" onClick={()=>setPage("home")}>View My Dashboard <ArrowRight/></button></Glass></div>
  </AppShell>
}

function Dashboard({setPage}) {
  const user = useUser();
  const data = useAppData();
  const d=data.dashboard;
  return <AppShell page="home" setPage={setPage}>
    <PageTitle title={`Welcome back, ${(user.name || "there").split(" ")[0]}! 👋`} subtitle="Here’s your personalized career overview." action={<div className="tip"><Lightbulb/> Small steps today,<br/>bigger opportunities tomorrow.</div>}/>
    <div className="stat-grid">
      <Glass><h3><FileText/> Resume Score</h3><ProgressRing value={data.resume.score}/></Glass>
      <Glass><h3><BarChart3/> Skills Identified</h3><div className="big-number">{d.skillsIdentified}</div><span>key skills</span></Glass>
      <Glass><h3><Target/> Recommended Roles</h3><div className="big-number">{d.recommendedRoles}</div><span>roles</span></Glass>
      <Glass><h3><BookOpen/> Preparation Status</h3><ProgressRing value={d.preparationStatus}/></Glass>
    </div>
    <div className="two-col">
      <Glass><CardHead icon={<BarChart3/>} title="Your Skill Analysis" link="View Details" onClick={()=>setPage("resume")}/>{d.skillAnalysis.map(([n,v])=><Bar key={n} label={n} value={v}/>)}</Glass>
      <Glass><CardHead icon={<Target/>} title="Top Role Matches" link="View All"/>{d.roleMatches.map(([n,v],i)=><div className="role-row" key={n}><b>{i+1}</b><span>{n}</span><strong>{v}%</strong></div>)}</Glass>
    </div>
    <div className="three-col">
      <Glass><CardHead icon={<Sparkles/>} title="Strengths"/><Pills items={d.strengths}/></Glass>
      <Glass><CardHead icon={<BarChart3/>} title="Areas to Improve"/><Pills items={d.areasToImprove}/></Glass>
      <Glass><CardHead icon={<Check/>} title="Next Steps"/><ul className="next-list">{d.nextSteps.map(x=><li key={x}><span/> {x}</li>)}</ul></Glass>
    </div>
  </AppShell>
}

function CardHead({icon,title,link,onClick}) { return <div className="card-head"><h2>{icon}{title}</h2>{link&&<button onClick={onClick}>{link} <ArrowRight size={16}/></button>}</div> }
function Bar({label,value}) { const has=value!==null && value!==undefined && value!=="" && Number.isFinite(Number(value)); return <div className="bar-row"><span>{label}</span><div><i style={{width:has?`${value}%`:"0%"}}/></div><b>{has?`${value}%`:"—"}</b></div> }
function Pills({items}) { return items.length ? <div className="pills">{items.map(x=><span key={x}>{x}</span>)}</div> : <div className="empty-inline">No data yet. This section will populate after backend analysis.</div> }

function ResumeAnalysis({setPage,onDownloadReport,onAnalyzeResume}) {
  const r=useAppData().resume;
  const [reportError,setReportError]=useState("");
  const [reportData,setReportData]=useState(null);
  const [reportLoading,setReportLoading]=useState(false);
  const loadReport=async()=>{
    setReportError("");
    setReportLoading(true);
    try {
      const result=await onDownloadReport();
      setReportData(result);
      return result;
    } catch(e) { setReportError(e.message || "Could not generate the report."); throw e; }
    finally { setReportLoading(false); }
  };
  const download=async()=>{
    try {
      const data=await loadReport();
      const text=formatReportText(data);
      const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
      const url=URL.createObjectURL(blob); const link=document.createElement("a");
      link.href=url; link.download="careersage-resume-report.txt"; link.click();
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch { /* The readable error is shown beside the report controls. */ }
  };
  const view=async()=>{try { await loadReport(); } catch { /* Error is shown inline. */ }};
  useEffect(()=>{
    if(r.fileName) view();
  },[r.fileName]);
  return <AppShell page="resume" setPage={setPage}>
    <PageTitle title="Resume Analysis" subtitle="Here’s a clear breakdown of your resume and what you can improve." action={<div className="actions"><button className="secondary" onClick={download} disabled={reportLoading}><Download/> {reportLoading ? "Preparing report…" : "Download report"}</button><button className="secondary" onClick={view} disabled={reportLoading}><Share2/> {reportLoading ? "Loading…" : "Refresh report"}</button></div>}/>
    {reportError && <div className="empty-inline" role="alert">{reportError}</div>}
    {reportLoading && !reportData && <div className="empty-inline report-loading" role="status">Preparing a clear report from your resume and practice answers…</div>}
    {reportData && <HumanReport report={reportData} fileName={r.fileName}/>}
    <ResumeRefresh onAnalyze={onAnalyzeResume} initialRole={r.targetRole} currentFile={r.fileName}/>
    <div className="analysis-grid">
      <Glass><CardHead icon={<FileText/>} title="Overall Resume Score"/><div className="score-panel"><ProgressRing value={r.score}/><div>{[["Content Quality",r.contentQuality],["Skill Relevance",r.skillRelevance],["Role Alignment",r.roleAlignmentScore],["Clarity & Structure",r.clarity]].map(([n,v])=><Bar key={n} label={n} value={v}/>)}</div></div></Glass>
      <Glass><CardHead icon={<Lightbulb/>} title="Quick Insights"/>{r.insights.map((x,i)=><div className="insight" key={x}><span>{i+1}</span><p>{x}</p></div>)}</Glass>
      <Glass className="span-2"><CardHead icon={<BarChart3/>} title="Skills Analysis"/><div className="skill-cols"><SkillGroup title="Technical Skills" items={r.technicalSkills}/><SkillGroup title="Soft Skills" items={r.softSkills}/><SkillGroup title="Other Skills" items={r.otherSkills}/></div></Glass>
      <Glass><CardHead icon={<Search/>} title="Keyword Match"/><Metric label="Matched Keywords" value={r.matchedKeywords}/><Metric label="Missing Keywords" value={r.missingKeywords}/><Metric label="Suggested Keywords" value={r.suggestedKeywords}/></Glass>
      <Glass><CardHead icon={<Target/>} title="Role Alignment"/>{r.roleAlignment.map(x=><div className="role-detail" key={x.role}><b>{x.role}</b><strong>{x.score}%</strong><span>{x.skills}</span></div>)}</Glass>
      <Glass><CardHead icon={<Sparkles/>} title="Suggestions to Improve"/>{r.suggestions.map((x,i)=><div className="suggestion" key={x}><b>{i+1}</b><span>{x}</span></div>)}</Glass>
    </div>
  </AppShell>
}

function HumanReport({report,fileName}) {
  const score=report.ats_score == null || report.ats_score === "" ? null : (Number.isFinite(Number(report.ats_score)) ? Number(report.ats_score) : null);
  const average=report.average_interview_score == null || report.average_interview_score === "" ? null : (Number.isFinite(Number(report.average_interview_score)) ? Number(report.average_interview_score) : null);
  const strengths=report.top_strengths || [];
  const improvements=report.top_weaknesses || [];
  const fixes=report.resume_fixes || [];
  const resources=report.learning_resources || [];
  const nextSteps=report.next_steps || [];
  const summary=score == null ? "Your report is ready." : score >= 75
    ? "Your resume includes many details that match the selected role. A few targeted edits can make those strengths easier to see."
    : score >= 50
      ? "Your resume has a useful starting point and some relevant experience. Adding clearer role-related details could strengthen it."
      : "Your resume may need more detail that connects your experience to the selected role. Start with the practical suggestions below.";
  const interviewSummary=average == null
    ? "No practice answers have been scored yet. Complete an interview practice answer to receive feedback here."
    : average >= 3.8
      ? "Your practice answers are coming across well. Keep using specific examples to support your points."
      : average >= 2.5
        ? "You have a foundation to build on. Try making each answer more specific and easier to follow."
        : "For your next answer, respond directly to the question and support your point with one clear example.";
  return <Glass className="span-2 human-report-card" aria-live="polite">
    <div className="human-report-heading">
      <div><span className="report-eyebrow">YOUR PERSONAL REPORT</span><h2>Resume and interview feedback</h2><p>{fileName ? `Based on ${fileName}` : "Based on your latest resume and practice answers"}{report.target_role ? ` for ${report.target_role}` : ""}</p></div>
      <div className="report-score"><strong>{score == null ? "—" : score}</strong><span>/ 100</span><small>Resume match score</small></div>
    </div>
    <p className="report-summary">{summary}</p>
    <p className="report-explainer">The score shows how closely the resume matches the selected role and common resume checks. It is not a prediction of whether you will get a job.</p>
    <div className="report-sections">
      <section className="report-section"><h3>Interview practice</h3><p>{average == null ? interviewSummary : `${interviewSummary} Your average answer score is ${average.toFixed(1)} out of 5.`}</p></section>
      <ReportList title="What is working well" items={strengths.map(plainFinding)} empty="No clear strengths were recorded yet. Keep adding relevant experience and examples to your resume." tone="positive"/>
      <ReportList title="What to improve next" items={improvements.map(plainFinding)} empty="No major improvement areas were identified from the available answers." tone="focus"/>
      <section className="report-section report-section-wide"><h3>Resume edits to consider</h3>{fixes.length ? <div className="report-fixes">{fixes.map((fix,index)=><article className="report-fix" key={`${fix.gap_id || "fix"}-${index}`}><b>Suggestion {index+1}</b>{fix.before && <p><strong>Your current wording:</strong> {fix.before}</p>}<p><strong>Try this:</strong> {fix.after_suggestion}</p></article>)}</div> : <p>No specific bullet edits were generated from this resume.</p>}</section>
      <section className="report-section"><h3>Helpful practice</h3>{resources.length ? <ul>{resources.map((item,index)=><li key={`${item.topic}-${index}`}><strong>{item.topic}:</strong> {item.description}</li>)}</ul> : <p>No extra practice resource was suggested.</p>}</section>
      <section className="report-section"><h3>Your next steps</h3>{nextSteps.length ? <ol>{nextSteps.map((item,index)=><li key={`${item}-${index}`}>{plainNextStep(item)}</li>)}</ol> : <p>Review the suggestions above and practice one answer to add interview feedback.</p>}</section>
    </div>
    <p className="report-footnote">This feedback comes from your uploaded resume and practice answers. Check that any suggested skills or results are accurate before adding them to your resume.</p>
  </Glass>;
}

function ReportList({title,items,empty,tone}) {
  return <section className={`report-section report-${tone}`}><h3>{title}</h3>{items.length ? <ul>{items.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>{empty}</p>}</section>;
}

function formatReportText(report) {
  const role=report.target_role ? ` for ${report.target_role}` : "";
  const lines=["CAREERSAGE — RESUME AND INTERVIEW REPORT","",`Resume match score${role}: ${report.ats_score ?? "Not available"}/100`,`This score compares your resume with the selected role and common resume checks. It is not a hiring prediction.`,""];
  if(report.average_interview_score == null) lines.push("INTERVIEW PRACTICE","No practice answers have been scored yet. Complete an interview answer to receive feedback here.");
  else lines.push("INTERVIEW PRACTICE",`Average answer score: ${Number(report.average_interview_score).toFixed(1)} out of 5.`, "Use specific examples and keep each answer easy to follow.");
  lines.push("", "WHAT IS WORKING WELL");
  if(report.top_strengths?.length) lines.push(...report.top_strengths.map(item=>`• ${plainFinding(item)}`));
  else lines.push("No clear strengths were recorded yet.");
  lines.push("", "WHAT TO IMPROVE NEXT");
  if(report.top_weaknesses?.length) lines.push(...report.top_weaknesses.map(item=>`• ${plainFinding(item)}`));
  else lines.push("No major improvement areas were identified from the available answers.");
  lines.push("", "RESUME EDITS TO CONSIDER");
  if(report.resume_fixes?.length) lines.push(...report.resume_fixes.map((item,index)=>`${index+1}. ${item.before ? `Current wording: ${item.before}\n   ` : ""}Try this: ${item.after_suggestion}`));
  else lines.push("No specific bullet edits were generated from this resume.");
  lines.push("", "HELPFUL PRACTICE");
  if(report.learning_resources?.length) lines.push(...report.learning_resources.map(item=>`• ${item.topic}: ${item.description}`));
  else lines.push("No extra practice resource was suggested.");
  lines.push("", "YOUR NEXT STEPS");
  if(report.next_steps?.length) lines.push(...report.next_steps.map((item,index)=>`${index+1}. ${plainNextStep(item)}`));
  else lines.push("Review the suggestions above and complete a practice answer to add interview feedback.");
  lines.push("", "Before editing your resume, make sure every suggested skill and result accurately reflects your experience.");
  return lines.join("\n");
}

function plainFinding(item) {
  const split=item.indexOf(":");
  if(split<0) return item;
  const label=item.slice(0,split).trim();
  const detail=item.slice(split+1).trim();
  const interview=label.match(/^Interview (relevance|specificity|structure|communication) \(average ([^)]+)\)$/i);
  if(interview) {
    const dimension={relevance:"answering the question",specificity:"giving specific details",structure:"organizing the answer",communication:"clear communication"}[interview[1].toLowerCase()];
    return `Your average score for ${dimension} was ${interview[2]}.`;
  }
  if(label==="Required sections present") return detail==="All key sections found" ? "Your resume includes the main sections most employers expect." : `Consider adding or clearly labeling these sections: ${detail.replace(/^Missing section\(s\):\s*/i,"")}.`;
  if(label==="Contact info") return detail==="Email and phone found" ? "Your resume appears to include both an email address and phone number." : `Add the missing contact detail${detail.toLowerCase().includes(" and ") ? "s" : ""}: ${detail.replace(/^Missing\s*/i,"")}.`;
  if(label==="Role keyword match") {
    const counts=detail.match(/Matched (\d+) of (\d+)/i);
    return counts ? `Your resume mentions ${counts[1]} of ${counts[2]} skills associated with this role. Add other relevant skills only when they match your experience.` : detail;
  }
  if(label==="Quantified achievements") {
    const counts=detail.match(/(\d+) of (\d+) bullets contain numbers/i);
    if(detail==="No bullet points detected") return "Add clear bullet points to describe your projects or work experience.";
    return counts ? `${counts[1]} of your ${counts[2]} bullets include numbers. Where possible, show the real results of your work with measurable details.` : detail;
  }
  if(label==="Length") {
    const words=detail.match(/(\d+) words/i);
    if(!words) return detail;
    return detail.startsWith("Good length") ? `Your resume is ${words[1]} words long, within the recommended range.` : `Your resume is ${words[1]} words long. Review whether it needs more relevant detail or can be shortened; the guide used here is 250 to 700 words.`;
  }
  return `${label}: ${detail}`;
}

function plainNextStep(item) {
  const match=item.match(/^Improve: (.+)\.$/);
  if(!match) return item;
  const names={"role keyword match":"Add more skills from the selected role when they truthfully match your experience.","required sections present":"Add any missing standard resume sections that apply to you.","quantified achievements":"Add real numbers to show the scale or result of your work.","contact info":"Check that your resume includes the contact details you want employers to use.","length":"Review the resume length and keep the most relevant information."};
  return names[match[1].toLowerCase()] || `Focus on improving ${match[1].toLowerCase()} in your resume.`;
}

function ResumeRefresh({onAnalyze,initialRole,currentFile}) {
  const [file,setFile]=useState(null);
  const [role,setRole]=useState(initialRole || "Software Engineer");
  const input=useRef(null);
  useEffect(()=>{ if(initialRole) setRole(initialRole); },[initialRole]);
  return <Glass className="upload-card">
    <h2>Update your resume analysis</h2>
    <p>{currentFile ? `Current resume: ${currentFile}. Upload a replacement to refresh all resume-based pages.` : "Upload a PDF or DOCX resume to populate your analysis and practice pages."}</p>
    <label className="field"><Target size={20}/><span><b>Target role</b><select value={role} onChange={e=>setRole(e.target.value)}><option>Software Engineer</option><option>Data Analyst</option><option>Machine Learning Engineer</option><option>Web Developer</option></select></span></label>
    <div className="dropzone" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(e.dataTransfer.files?.[0])setFile(e.dataTransfer.files[0]);}} onClick={()=>input.current?.click()}>
      <input ref={input} type="file" accept=".pdf,.docx" onChange={e=>setFile(e.target.files?.[0] || null)} hidden/>
      {file ? <><Check className="success-icon"/><b>{file.name}</b><span>{(file.size/1024/1024).toFixed(2)} MB</span></> : <><button className="primary" type="button">Choose resume <Upload size={18}/></button><span>PDF or DOCX · Maximum 10 MB</span></>}
    </div>
    {file && <button className="primary wide" onClick={()=>onAnalyze(file,role,"resume")}>Analyze replacement resume <ArrowRight/></button>}
  </Glass>;
}

function SkillGroup({title,items}) {return <div><h4>{title}</h4>{items.length ? <div className="skill-tags">{items.map(x=><span key={x}>{x}</span>)}</div> : <div className="empty-inline">No data yet.</div>}</div>}
function Metric({label,value}) {return <div className="metric"><span>{label}</span><div className="metric-tags">{value.length ? value.map(x=><em key={x}>{x}</em>) : <span className="empty-inline">No data yet.</span>}</div></div>}

function Preparation({setPage,onPractice}) {
  const [tab,setTab]=useState("overview");
  const p=useAppData().preparation;
  if(tab==="progress") return <ProgressPage p={p} setPage={setPage} back={()=>setTab("overview")}/>;
  if(tab==="technical") return <QuestionBank title="Resume and Role Practice" subtitle="Practice questions generated from the uploaded resume and selected role." items={p.categories} icon={<Code2/>} setTab={setTab} setPage={setPage}/>;
  if(tab==="company") return <QuestionBank title="Company-wise Questions" subtitle="No company question dataset was included in the supplied files." items={p.companies} icon={<Building2/>} setTab={setTab} setPage={setPage} company/>;
  if(tab==="mock") return <MockTests tests={p.mockTests} setTab={setTab} setPage={setPage} onPractice={onPractice}/>;
  return <AppShell page="preparation" setPage={setPage}>
    <PageTitle title="Interview Preparation" subtitle="Practice, improve and get interview ready with personalized questions." action={<div className="tip"><Lightbulb/> Focused practice today,<br/>confidence tomorrow.</div>}/>
    <div className="prep-tabs">{[
      ["technical","Technical Questions",Code2],["company","Company-wise",Building2],["mock","Mock Tests",ClipboardList],["topic","Topic-wise Practice",BookOpen],["progress","Progress",BarChart3]
    ].map(([id,label,I])=><button key={id} onClick={()=>setTab(id)}><I size={20}/>{label}</button>)}</div>
    <div className="two-col">
      <Glass><CardHead icon={<Target/>} title="Your Interview Readiness"/><div className="score-panel"><ProgressRing value={p.readiness}/><div>{[["Technical Knowledge",p.technicalKnowledge],["Problem Solving",p.problemSolving],["Communication",p.communication],["System Design",p.systemDesign]].map(([n,v])=><Bar key={n} label={n} value={v}/>)}</div></div></Glass>
      <Glass><CardHead icon={<Clock3/>} title="Upcoming Practice Plan" link="View Plan"/>{p.mockTests.map((x,i)=><div className="plan-row" key={x.name}><span><b>{x.name}</b><small>{x.meta}</small></span><button className="outline" onClick={()=>setTab("mock")}>{i===1?"View":"Start"}</button></div>)}</Glass>
    </div>
    <div className="two-col">
      <Glass><CardHead icon={<Code2/>} title="Technical Question Categories" link="View All" onClick={()=>setTab("technical")}/><div className="category-grid">{p.categories.map(x=><button key={x.name} onClick={()=>setTab("technical")}><Code2/><span><b>{x.name}</b><small>{x.count}+ questions</small></span><ChevronRight/></button>)}</div></Glass>
      <Glass><CardHead icon={<Building2/>} title="Company-wise Questions" link="View All" onClick={()=>setTab("company")}/><div className="company-grid">{p.companies.map(x=><button key={x.name} onClick={()=>setTab("company")}><span className="company-mark">{x.name[0]}</span><span><b>{x.name}</b><small>{x.count}+ questions</small></span><ChevronRight/></button>)}</div></Glass>
    </div>
    <div className="three-col">
      <Glass><CardHead icon={<Clock3/>} title="Recent Practice Activity"/><table><thead><tr><th>Topic</th><th>Difficulty</th><th>Score</th></tr></thead><tbody>{p.recentActivity.map(x=><tr key={x[0]}><td>{x[0]}</td><td><span className="difficulty">{x[1]}</span></td><td>{x[3]}</td></tr>)}</tbody></table></Glass>
      <Glass><CardHead icon={<ClipboardList/>} title="Mock Tests" link="View All" onClick={()=>setTab("mock")}/>{p.mockTests.map(x=><div className="mock-row" key={x.name}><span><b>{x.name}</b><small>{x.meta}</small></span><button className="outline" onClick={()=>setTab("mock")}>Start</button></div>)}</Glass>
      <Glass><CardHead icon={<BarChart3/>} title="Progress Overview" link="View" onClick={()=>setTab("progress")}/><MiniChart data={p.progress}/></Glass>
    </div>
  </AppShell>
}

function QuestionBank({title,subtitle,items,icon,setTab,setPage,company=false}) {
  const [q,setQ]=useState("");
  return <AppShell page="preparation" setPage={setPage}>
    <PageTitle title={title} subtitle={subtitle} action={<button className="secondary" onClick={()=>setTab("overview")}><ArrowRight style={{transform:"rotate(180deg)"}}/> Back</button>}/>
    <Glass className="bank">
      <div className="search-row"><div className="searchbox"><Search size={19}/><input placeholder="Search questions..." value={q} onChange={e=>setQ(e.target.value)}/></div><select><option>All difficulties</option><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
      {items.length ? <div className="bank-grid">{items.filter(x=>x.name.toLowerCase().includes(q.toLowerCase())).map(x=><button className="bank-card" key={x.name} onClick={()=>setPage("interview")}><div className="bank-icon">{company?<Building2/>:icon}</div><div><h3>{x.name}</h3><p>{x.count} resume-based questions</p></div><ArrowRight/></button>)}</div> : <div className="empty-inline">{company ? "Company-specific question data is not present in the supplied ZIP files." : "Upload and analyze a resume to generate role and gap-specific questions."}</div>}
      {!company && <button className="primary" onClick={()=>setPage("interview")}>Start resume-based practice <ArrowRight/></button>}
    </Glass>
  </AppShell>
}

function MockTests({tests,setTab,setPage,onPractice}) {
  return <AppShell page="preparation" setPage={setPage}>
    <PageTitle title="Mock Tests" subtitle="Test yourself under realistic interview conditions." action={<button className="secondary" onClick={()=>setTab("overview")}><ArrowRight style={{transform:"rotate(180deg)"}}/> Back</button>}/>
    {tests.length ? <div className="mock-grid">{tests.map((x,i)=><Glass key={`${i}-${x.question_id}`}><div className="mock-icon"><ClipboardList/></div><h2>{x.name}</h2><p>{x.meta}</p><button className="primary wide" onClick={()=>onPractice(x.question_id)}>Practice this question <Play size={18}/></button></Glass>)}</div> : <Glass><div className="empty-inline">Analyze a resume to build practice questions from its gaps and the selected role.</div></Glass>}
  </AppShell>
}

function ProgressPage({p,setPage,back}) {
  const attempts=p.recentActivity.length;
  const latest=p.recentActivity.at(-1)?.[3];
  const average=attempts ? (p.recentActivity.reduce((sum,row)=>sum+Number(row[3] || 0),0)/attempts).toFixed(1) : null;
  return <AppShell page="progress" setPage={setPage}>
    <PageTitle title="Your Progress" subtitle="See how your preparation is improving over time." action={<button className="secondary" onClick={back}><ArrowRight style={{transform:"rotate(180deg)"}}/> Back to Preparation</button>}/>
    <div className="progress-grid">
      <Glass className="span-2"><CardHead icon={<BarChart3/>} title="Progress Overview"/><BigChart data={p.progress}/></Glass>
      <Glass><CardHead icon={<Trophy/>} title="Practice Summary"/><div className="summary-list"><div><b>{attempts}</b><span>Questions attempted</span></div><div><b>{latest == null ? "—" : `${latest}/5`}</b><span>Latest answer score</span></div><div><b>{average == null ? "—" : `${average}/5`}</b><span>Average answer score</span></div></div></Glass>
    </div>
  </AppShell>
}

function MiniChart({data}) { if(!data.length) return <div className="empty-inline">Progress data will appear after you complete practice sessions.</div>; return <div className="mini-chart">{data.map(x=><div key={x.week}><div className="dot" style={{bottom:`${x.accuracy}%`}}/><div className="chart-line" style={{height:`${x.accuracy}%`}}/><span>{x.week.replace("Week ","W")}</span></div>)}</div> }
function BigChart({data}) {
  if(!data.length) return <div className="empty-chart">Progress data will appear after you complete practice sessions.</div>;
  return <div className="big-chart"><div className="y-labels"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-area">{data.map((x,i)=><div className="chart-col" key={x.week}><div className="chart-point" style={{bottom:`${x.accuracy}%`}}/><div className="chart-stem" style={{height:`${x.accuracy}%`}}/><span>{x.week}</span></div>)}</div></div>
}

function Interview({setPage,sessionId,selectedQuestionId,onQuestionSelected}) {
  const data=useAppData().interview;
  const [answer,setAnswer]=useState("");
  const [count,setCount]=useState(data.completedQuestions || 0);
  const [questions,setQuestions]=useState([]);
  const [questionIndex,setQuestionIndex]=useState(0);
  const [feedback,setFeedback]=useState(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  useEffect(()=>setCount(data.completedQuestions || 0),[data.completedQuestions]);
  useEffect(()=>{
    if(!sessionId) return;
    setBusy(true);
    generateQuestions(sessionId,20).then(result=>{
      const next=result.questions || [];
      setQuestions(next);
      const selected=next.findIndex(q=>q.question_id===selectedQuestionId);
      setQuestionIndex(selected >= 0 ? selected : 0);
      onQuestionSelected("");
    }).catch(e=>setError(e.message)).finally(()=>setBusy(false));
  },[sessionId]);
  const question=questions[questionIndex]?.question || data.question;
  const send=async()=>{
    if(!answer.trim() || !questions[questionIndex]) return;
    setBusy(true); setError("");
    try {
      const result=await scoreAnswer(sessionId,questions[questionIndex].question_id,answer.trim());
      setFeedback(result); setCount(c=>c+1); setAnswer("");
      if(questionIndex+1<questions.length) setQuestionIndex(i=>i+1);
    } catch(e) { setError(e.message || "Answer scoring failed."); }
    finally { setBusy(false); }
  };
  return <AppShell page="interview" setPage={setPage}>
    <PageTitle title="Practice Interview" subtitle="A realistic interview experience, tailored for you."/>
    <div className="interview-layout">
      <Glass className="chat-panel">
        <div className="chat-head"><h2><MessageSquare/> Interview Session</h2><div><span className="timer"><Clock3/> 00:00:00</span><button className="danger">End Session</button></div></div>
        <div className="chat">
          <div className="bubble ai"><div className="avatar">AI</div><div><b>Hello!</b><p>Your interview session will use questions returned by the backend. Take your time and answer naturally.</p></div></div>
          <div className="bubble ai"><div className="avatar">AI</div><div><b>Here’s your next question.</b><p>{question || "Your interview question will appear here once the backend starts the interview."}</p></div></div>
          {feedback && <div className="bubble ai"><div className="avatar">AI</div><div><b>Answer feedback · {feedback.overall}/5</b><p>{[...(feedback.strengths || []), ...(feedback.improvements || [])].join(" ")}</p></div></div>}
        </div>
        <div className="answer-box"><div className="answer-tabs"><button className="selected"><KeyboardIcon/> Type your answer</button><button><Mic/> Record Answer</button></div><div className="answer-row"><textarea value={answer} onChange={e=>setAnswer(e.target.value)} placeholder={question ? "Type your response here..." : (busy ? "Loading backend questions…" : "Upload a resume to start an interview.")} disabled={!question || busy}/><button className="send" onClick={send} disabled={!question || busy || !answer.trim()}><Send/></button></div>{error && <div className="empty-inline" role="alert">{error}</div>}</div>
      </Glass>
      <div className="interview-side">
        <Glass><CardHead icon={<FileText/>} title="Question Details"/><dl><dt>Category</dt><dd>{data.category || "—"}</dd><dt>Difficulty</dt><dd>{data.difficulty || "—"}</dd><dt>Topic</dt><dd>{data.topic || "—"}</dd></dl></Glass>
        <Glass><CardHead icon={<BarChart3/>} title="Interview Progress"/><div className="score-panel compact"><ProgressRing value={Math.min(100,count*10)}/><div><p>Questions Attempted <b>{count}</b></p><p>Total Questions <b>{data.totalQuestions ?? "—"}</b></p><p>Time Spent <b>—</b></p></div></div></Glass>
        <Glass><CardHead icon={<Clock3/>} title="Previous Questions" link="View All"/>{questions.slice(0,questionIndex).map(q=><div className="insight" key={q.question_id}><p>{q.question}</p></div>)}{questionIndex===0&&<div className="empty-inline">Previous questions will appear here after you practice.</div>}</Glass>
      </div>
    </div>
  </AppShell>
}

function KeyboardIcon(){return <span style={{fontSize:16}}>⌨</span>}

function Profile({setPage}) {
  const user=useUser();
  return <AppShell page="profile" setPage={setPage}><PageTitle title="Profile" subtitle="Your CareerSage account details."/><Glass className="profile-card"><Logo/><h2>{user.name || "—"}</h2><p>{user.email || "—"}</p><p>{user.phone || "—"}</p><button className="secondary" onClick={()=>setPage("landing")}>Log out</button></Glass></AppShell>
}

function App(){
  const [user,setUser]=useState(()=>{
    try { return JSON.parse(localStorage.getItem("careersage_user")) || {name:"",email:"",phone:""}; }
    catch { return {name:"",email:"",phone:""}; }
  });
  const [page,setPageState]=useState(()=>{
    try {
      const saved=JSON.parse(localStorage.getItem("careersage_user"));
      if(!saved?.email) return "landing";
      const route=window.location.hash.slice(1);
      const known=["home","resume","upload","preparation","interview","progress","profile"];
      return known.includes(route) ? route : "home";
    } catch { return "landing"; }
  });
  const setPage=(next)=>{
    setPageState(next);
    // Loading is transient: keeping it out of browser history prevents Back
    // from returning to a stranded spinner after a successful upload.
    if(next !== "analyzing" && window.location.hash !== `#${next}`) window.history.pushState({page:next},"",`#${next}`);
  };
  const [appData,setAppData]=useState(EMPTY_APP_DATA);
  const [analysisError,setAnalysisError]=useState("");
  const [sessionId,setSessionId]=useState("");
  const [selectedQuestionId,setSelectedQuestionId]=useState("");
  const [analysisReturnPage,setAnalysisReturnPage]=useState("upload");
  useEffect(()=>{
    const restoreRoute=()=>{
      const route=window.location.hash.slice(1);
      const known=["home","resume","upload","preparation","interview","progress","profile"];
      if(!user.email) setPageState("landing");
      else setPageState(known.includes(route) ? route : "home");
    };
    window.addEventListener("popstate",restoreRoute);
    return ()=>window.removeEventListener("popstate",restoreRoute);
  },[user.email]);
  useEffect(()=>{
    if(!user.email || !isBackendConfigured() || page==="analyzing") return;
    getDashboard(user.email)
      .then(response=>{
        if(response && typeof response === "object") { setAppData(prev=>({...prev,...response})); setSessionId(response.sessionId || ""); }
      })
      .catch(()=>{ /* Keep empty states until the backend is available. */ });
  },[user.email,page]);
  const goLogin=()=>setPage("login");
  const continueFromLogin=async(mode,form)=>{
    if(!isBackendConfigured()) throw new Error("Backend is not connected. Set VITE_API_BASE_URL and start the backend.");
    const payload=mode === "register"
      ? {name:form.name.trim(),email:form.email.trim(),phone:form.phone.trim(),password:form.password}
      : {email:form.email.trim(),password:form.password};
    const result=mode === "register" ? await registerUser(payload) : await loginUser(payload);
    const next={name:result.user.name,email:result.user.email,phone:result.user.phone};
    setUser(next);
    localStorage.setItem("careersage_user", JSON.stringify(next));
    let destination="upload";
    try {
      const saved=await getDashboard(next.email);
      if(saved && typeof saved === "object") {
        setAppData(prev=>({...prev,...saved}));
        setSessionId(saved.sessionId || "");
        if(saved.resume?.fileName) destination="resume";
      }
    } catch { /* Authentication succeeded; the upload page remains available while dashboard data reconnects. */ }
    setPage(destination);
  };
  const analyzeResume=async(file,targetRole,returnPage="done")=>{
    setAnalysisError("");
    setAnalysisReturnPage(returnPage);
    setPage("analyzing");
    try {
      if(!isBackendConfigured()) throw new Error("Backend is not connected. Set VITE_API_BASE_URL and start the backend.");
      const analysis=await uploadResume(file,user.email,targetRole);
      setSessionId(analysis.session_id || "");
      const response=await getDashboard(user.email);
      if(response && typeof response === "object") { setAppData(prev=>({...prev,...response})); setSessionId(response.sessionId || analysis.session_id || ""); }
      setPage(returnPage);
    } catch(error) {
      setAnalysisError(error.message || "Resume analysis failed. Please try again.");
    }
  };
  const downloadReport=async()=>{
    if(!sessionId) throw new Error("Analyze a resume in this session before requesting its report.");
    try {
      return await getReport(sessionId);
    } catch(error) { throw new Error(error.message || "Report could not be generated."); }
  };
  const logout=()=>{
    setUser({name:"",email:"",phone:""});
    localStorage.removeItem("careersage_user");
    setAppData(EMPTY_APP_DATA);
    setSessionId("");
    setPage("landing");
  };
  const navigate=(next)=>{
    if(next==="landing") return logout();
    setPage(next);
  };
  const beginPractice=(questionId="")=>{setSelectedQuestionId(questionId);setPage("interview");};
  let content;
  if(page==="landing") content=<Landing go={goLogin}/>;
  else if(page==="login") content=<Login go={continueFromLogin}/>;
  else if(page==="upload") content=<ResumeUpload setPage={setPage} onAnalyze={analyzeResume}/>;
  else if(page==="analyzing") content=<Analyzing setPage={setPage} error={analysisError} returnPage={analysisReturnPage}/>;
  else if(page==="done") content=<Done setPage={setPage}/>;
  else if(page==="home") content=<Dashboard setPage={navigate}/>;
  else if(page==="resume") content=<ResumeAnalysis setPage={navigate} onDownloadReport={downloadReport} onAnalyzeResume={analyzeResume}/>;
  else if(page==="preparation") content=<Preparation setPage={navigate} onPractice={beginPractice}/>;
  else if(page==="interview") content=<Interview setPage={navigate} sessionId={sessionId} selectedQuestionId={selectedQuestionId} onQuestionSelected={setSelectedQuestionId}/>;
  else if(page==="progress") content=<ProgressPage p={appData.preparation} setPage={navigate} back={()=>setPage("preparation")}/>;
  else if(page==="profile") content=<Profile setPage={navigate}/>;
  else content=<Landing go={goLogin}/>;
  return <UserContext.Provider value={user}><DataContext.Provider value={appData}>{content}</DataContext.Provider></UserContext.Provider>;
}
createRoot(document.getElementById("root")).render(<App/>);
