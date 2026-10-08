const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.nav-links');

menuButton.addEventListener('click', () => {
  const isOpen = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
});
navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const themeButton = document.querySelector('.theme-toggle');
function updateThemeControl() {
  const dark = document.documentElement.dataset.theme === 'dark';
  themeButton.setAttribute('aria-pressed', String(dark));
  themeButton.setAttribute('aria-label', `Switch to ${dark ? 'bright' : 'dark'} mode`);
  themeButton.querySelector('.theme-label').textContent = dark ? 'Bright mode' : 'Dark mode';
  themeButton.querySelector('.theme-icon').textContent = dark ? '☼' : '☾';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#201b27' : '#fffdfb';
}
updateThemeControl();
themeButton.addEventListener('click', () => {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('pixel-petals-theme', theme); } catch { /* Theme still works for this page view. */ }
  updateThemeControl();
});

const demo = { stage: 0, role: '', resume: '', fileName: '', issues: [], ats: 0, answer: '', score: null, questionVariant: 0 };
const content = document.querySelector('#studio-content');
const stageButtons = [...document.querySelectorAll('.studio-step')];
const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const goToStudio = (stage = 0) => {
  document.querySelector('#studio').scrollIntoView({ behavior: 'smooth' });
  setStage(stage);
};

function analyzeResume() {
  const text = demo.resume.toLowerCase();
  if (demo.resume.trim().length < 60) return false;
  const sections = ['experience', 'education', 'skills', 'projects', 'summary'].filter((word) => text.includes(word));
  const measurable = /\d|%|\$/.test(text);
  demo.ats = Math.min(98, 42 + sections.length * 7 + (measurable ? 10 : 0) + (/@/.test(text) ? 5 : 0) + (/(lead|managed|mentored|owned|coordinated)/.test(text) ? 6 : 0));
  demo.issues = [];
  if (!measurable) demo.issues.push({ title: 'Add measurable outcomes', detail: 'Several bullets describe work without a number, scale or result. Add an honest metric where you have one.' });
  if (!/(lead|managed|mentored|owned|coordinated|guided)/.test(text)) demo.issues.push({ title: 'Show ownership and collaboration', detail: 'Add an example of leading a task, working across a team or taking responsibility for an outcome.' });
  if (!/(skills|technical skills|tools)/.test(text)) demo.issues.push({ title: 'Make relevant skills easy to find', detail: 'Add a clearly labeled skills section with tools and capabilities that match your target role.' });
  if (!/(experience|employment|internship|work history)/.test(text)) demo.issues.push({ title: 'Clarify your experience', detail: 'Use a clear experience heading and give each role a title, organization and date range.' });
  if (demo.issues.length === 0) demo.issues.push({ title: 'Tailor details to the target role', detail: 'Your resume has several useful signals. Compare the language in your strongest examples with the role requirements.' });
  demo.score = null;
  return true;
}

async function loadResumeFile(file) {
  if (!file) return;
  demo.fileName = file.name;
  const name = document.querySelector('#file-name');
  if (name) name.textContent = file.name;
  if (/\.(txt|md)$/i.test(file.name)) {
    demo.resume = await file.text();
    const field = document.querySelector('#resume-text');
    if (field) field.value = demo.resume;
  } else {
    const message = document.querySelector('#form-message');
    if (message) message.textContent = 'File selected. Paste its readable text below; this browser-only demo does not extract Word or PDF files.';
  }
}

function makeQuestion() {
  const role = demo.role.trim() || 'your target role';
  const issue = demo.issues[0]?.title.toLowerCase() || 'a key achievement';
  let questions;
  if (issue.includes('measurable')) questions = [
    `For a ${role} role, tell me about a project or task where your work made a difference. What changed, and how did you measure the result?`,
    `Describe a goal you worked toward in a ${role} or related project. What steps did you take, and what was the result?`,
    `Tell me about a time you improved a process. How did you know the change helped?`
  ];
  else if (issue.includes('ownership')) questions = [
    `For a ${role} role, describe a time you took ownership of a difficult task or helped a team move forward. What did you do, and what happened?`,
    `Tell me about a time you worked with others to overcome a setback. What part did you play?`,
    `Describe a moment you stepped up without being asked. What was needed, and what was the outcome?`
  ];
  else if (issue.includes('skills')) questions = [
    `Which skill is most important for the ${role} role you want, and can you describe a specific time you used it to solve a problem?`,
    `Tell me about a challenging problem where you used a skill needed in a ${role} role. How did you approach it?`,
    `What is a skill you have recently developed for ${role} work? Give an example of how you have applied it.`
  ];
  else questions = [
    `For a ${role} role, walk me through an experience that best shows you can handle the work. What was the challenge, what actions did you take, and what was the outcome?`,
    `What is a project you are proud of that relates to ${role}? What did you contribute, and what did you learn?`,
    `Tell me about a time you received feedback and used it to improve your work. What changed?`
  ];
  return questions[demo.questionVariant % questions.length];
}

function render() {
  stageButtons.forEach((button) => button.classList.toggle('is-active', Number(button.dataset.stage) === demo.stage));
  document.querySelector('#stage-label').textContent = `STEP ${String(demo.stage + 1).padStart(2, '0')} OF 07`;
  document.querySelector('#progress-fill').style.width = `${((demo.stage + 1) / 7) * 100}%`;
  if (demo.stage === 0) {
    content.innerHTML = `<div class="studio-title"><span>LET’S GET STARTED</span><h3>Bring your resume.</h3><p>Choose a resume file and add the text below so this private demo can review its structure.</p></div>
      <label class="upload-zone" for="resume-file"><span class="upload-symbol">↑</span><b>Drop your resume here or <u>browse files</u></b><small>PDF, DOC, DOCX or TXT · File stays on this device</small><strong id="file-name">${escapeHTML(demo.fileName || 'No file selected yet')}</strong></label>
      <input id="resume-file" type="file" accept=".pdf,.doc,.docx,.txt,.md,text/plain">
      <div class="field-row"><label for="target-role">Target role or industry <span>OPTIONAL</span></label><input id="target-role" type="text" placeholder="e.g. Junior UX designer" value="${escapeHTML(demo.role)}"></div>
      <div class="field-row"><label for="resume-text">Resume text <span>USED ONLY IN THIS TAB</span></label><textarea id="resume-text" rows="7" placeholder="Paste resume text here. You can remove your phone number or email first.\n\nFor PDF or Word files, paste the readable text here; this demo does not upload or extract documents from a server.">${escapeHTML(demo.resume)}</textarea><small class="field-hint">For a TXT file, text is filled in automatically. PDF and Word file text can be pasted here.</small></div>
      <div class="studio-actions"><p class="form-message" id="form-message"></p><button class="button button-dark" data-action="analyze">Analyze my resume <span>→</span></button></div>`;
    const zone = content.querySelector('.upload-zone');
    zone.addEventListener('dragover', (event) => { event.preventDefault(); zone.classList.add('is-dragging'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-dragging'));
    zone.addEventListener('drop', (event) => { event.preventDefault(); zone.classList.remove('is-dragging'); loadResumeFile(event.dataTransfer.files[0]); });
  } else if (!demo.resume || !demo.issues.length) {
    content.innerHTML = `<div class="locked-state"><span>✧</span><h3>Start with your resume</h3><p>Add your resume text first so the next steps can be tailored to you.</p><button class="button button-dark" data-action="stage" data-value="0">Go to upload <span>→</span></button></div>`;
  } else if (demo.stage === 1) {
    const blocks = ['experience', 'education', 'skills', 'projects', 'summary'].filter((word) => demo.resume.toLowerCase().includes(word));
    content.innerHTML = `<div class="studio-title"><span>RESUME SNAPSHOT</span><h3>Your first-pass analysis.</h3><p>This local prototype checks common resume signals. It is a practice aid, not a hiring or ATS guarantee.</p></div>
      <div class="analysis-score"><div class="score-dial" style="--score:${demo.ats}"><b>${demo.ats}</b><small>/ 100</small></div><div><span>STRUCTURE &amp; CLARITY CHECK</span><h4>${demo.ats >= 75 ? 'A clear starting point' : 'Room to make strengths clearer'}</h4><p>Based on section headings, measurable details and contact information found in the text you entered.</p></div></div>
      <div class="signal-list"><div><span>Found sections</span><b>${blocks.length ? blocks.map(escapeHTML).join(' · ') : 'No common headings detected'}</b></div><div><span>Resume text</span><b>${demo.resume.trim().split(/\s+/).length} words reviewed in this tab</b></div><div><span>Target role</span><b>${escapeHTML(demo.role || 'Not specified')}</b></div></div>
      <div class="studio-actions"><button class="button button-dark" data-action="stage" data-value="2">See improvement areas <span>→</span></button><button class="subtle-button" data-action="stage" data-value="0">Edit resume text</button></div>`;
  } else if (demo.stage === 2) {
    content.innerHTML = `<div class="studio-title"><span>PERSONALIZED REVIEW</span><h3>Areas to strengthen.</h3><p>These suggestions come from missing patterns in the text, not from a generative AI model.</p></div><div class="issue-list">${demo.issues.map((item, index) => `<article><span>0${index + 1}</span><div><b>${escapeHTML(item.title)}</b><p>${escapeHTML(item.detail)}</p></div><i>↗</i></article>`).join('')}</div><div class="studio-actions"><button class="button button-dark" data-action="stage" data-value="3">Build a mock interview <span>→</span></button><button class="subtle-button" data-action="stage" data-value="1">Back to analysis</button></div>`;
  } else if (demo.stage === 3) {
    content.innerHTML = `<div class="studio-title"><span>MOCK INTERVIEW · ${escapeHTML(demo.role || 'GENERAL PRACTICE')}</span><h3>Let’s practice one answer.</h3><p>Use this question to connect your experience to an improvement area.</p></div><div class="question-card"><span>YOUR QUESTION</span><p>${escapeHTML(makeQuestion())}</p><small>Tip: explain the situation, the action you took and the result.</small></div><div class="studio-actions"><button class="button button-dark" data-action="stage" data-value="4">Write my response <span>→</span></button><button class="subtle-button" data-action="new-question">Try another question ↻</button></div>`;
  } else if (demo.stage === 4) {
    content.innerHTML = `<div class="studio-title"><span>YOUR TURN</span><h3>Answer in your own words.</h3><p>A clear example is more useful than a perfect-sounding answer.</p></div><div class="question-card compact"><span>INTERVIEW QUESTION</span><p>${escapeHTML(makeQuestion())}</p></div><div class="field-row"><label for="answer-text">YOUR RESPONSE <span id="word-count">${demo.answer.trim() ? demo.answer.trim().split(/\s+/).length : 0} WORDS</span></label><textarea id="answer-text" rows="8" placeholder="Start with the situation, explain what you did, then share the result…">${escapeHTML(demo.answer)}</textarea></div><div class="response-tools"><button class="subtle-button" data-action="voice">◉ Dictate an answer</button><span id="voice-status">Voice input works in supported browsers.</span></div><div class="studio-actions"><button class="button button-dark" data-action="score">Get practice feedback <span>→</span></button><button class="subtle-button" data-action="stage" data-value="3">Review question</button></div>`;
  } else if (demo.stage === 5) {
    if (demo.score === null) { setStage(4); return; }
    const feedback = demo.score < 50 ? 'Add a specific example and explain your own contribution.' : demo.score < 75 ? 'Good start. Make the result and your personal contribution more specific.' : 'Strong practice answer. Keep the example concise and connect the outcome to the role.';
    content.innerHTML = `<div class="studio-title"><span>PRACTICE REPORT</span><h3>Your answer, reviewed.</h3><p>Use this as a writing prompt, not a measure of your ability or interview outcome.</p></div><div class="report-score"><div><b>${demo.score}</b><small>/ 100</small></div><section><span>ANSWER SIGNALS</span><h4>${demo.score >= 70 ? 'A promising example' : 'A useful first draft'}</h4><p>${feedback}</p></section></div><div class="report-metrics"><div><span>Specific example</span><b>${demo.answer.trim().split(/\s+/).length >= 35 ? 'Detailed' : 'Add detail'}</b></div><div><span>Action &amp; ownership</span><b>${/(i |my |led|built|created|improved|managed|designed|solved)/i.test(demo.answer) ? 'Present' : 'Could be clearer'}</b></div><div><span>Outcome</span><b>${/\d|result|outcome|increased|reduced|saved|delivered/i.test(demo.answer) ? 'Included' : 'Add the result'}</b></div></div><div class="report-tip"><span>ONE THING TO TRY</span><b>${escapeHTML(feedback)}</b></div><div class="studio-actions"><button class="button button-dark" data-action="stage" data-value="6">See my learning plan <span>→</span></button><button class="subtle-button" data-action="download">Download report ↓</button></div>`;
  } else {
    const lessons = demo.issues.map((item) => item.title);
    content.innerHTML = `<div class="studio-title"><span>PERSONALIZED NEXT STEPS</span><h3>Keep growing, one step at a time.</h3><p>A few practical actions based on the resume signals and answer you practiced.</p></div><div class="learning-list">${lessons.map((item, index) => `<article><span>0${index + 1}</span><div><b>${escapeHTML(item)}</b><p>${index === 0 ? 'Choose one example from a project, class or job and add the specific action you took and what changed.' : 'Pick one relevant experience and revise two bullets to show your contribution and the skills you used.'}</p></div><input type="checkbox" aria-label="Mark ${escapeHTML(item)} complete"></article>`).join('')}<article><span>✦</span><div><b>Practice the answer again</b><p>Try a shorter version, then compare whether the situation, your action and the outcome are easy to follow.</p></div><input type="checkbox" aria-label="Mark practice complete"></article></div><div class="studio-actions"><button class="button button-dark" data-action="reset">Review another resume <span>↺</span></button><button class="subtle-button" data-action="new-question">Practice another answer</button></div>`;
  }
}

function setStage(stage) {
  demo.stage = Math.max(0, Math.min(6, Number(stage)));
  render();
}

stageButtons.forEach((button) => button.addEventListener('click', () => setStage(button.dataset.stage)));
document.querySelectorAll('[data-open-stage]').forEach((button) => button.addEventListener('click', () => goToStudio(button.dataset.openStage)));
document.querySelector('#reset-demo').addEventListener('click', () => {
  Object.assign(demo, { stage: 0, role: '', resume: '', fileName: '', issues: [], ats: 0, answer: '', score: null, questionVariant: 0 });
  render();
});

content.addEventListener('input', (event) => {
  if (event.target.id === 'resume-text') demo.resume = event.target.value;
  if (event.target.id === 'target-role') demo.role = event.target.value;
  if (event.target.id === 'answer-text') {
    demo.answer = event.target.value;
    const count = document.querySelector('#word-count');
    if (count) count.textContent = `${demo.answer.trim() ? demo.answer.trim().split(/\s+/).length : 0} WORDS`;
  }
});

content.addEventListener('change', async (event) => {
  if (event.target.id !== 'resume-file' || !event.target.files[0]) return;
  await loadResumeFile(event.target.files[0]);
});

content.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'stage') return setStage(button.dataset.value);
  if (action === 'reset') {
    Object.assign(demo, { stage: 0, role: '', resume: '', fileName: '', issues: [], ats: 0, answer: '', score: null, questionVariant: 0 });
    return render();
  }
  if (action === 'analyze') {
    demo.role = document.querySelector('#target-role').value.trim();
    demo.resume = document.querySelector('#resume-text').value;
    const message = document.querySelector('#form-message');
    if (!analyzeResume()) { message.textContent = 'Add a little more resume text (at least 60 characters) to get a useful first pass.'; return; }
    setStage(1);
  }
  if (action === 'new-question') { demo.answer = ''; demo.questionVariant += 1; setStage(3); }
  if (action === 'score') {
    demo.answer = document.querySelector('#answer-text').value.trim();
    if (demo.answer.split(/\s+/).filter(Boolean).length < 8) { document.querySelector('#voice-status').textContent = 'Add a few more words so the feedback has something to review.'; return; }
    const answer = demo.answer;
    const words = answer.split(/\s+/).length;
    demo.score = Math.min(96, Math.max(35, 38 + (words >= 35 ? 18 : words >= 18 ? 10 : 0) + (/(i |my |led|built|created|improved|managed|designed|solved)/i.test(answer) ? 14 : 0) + (/\d|result|outcome|increased|reduced|saved|delivered/i.test(answer) ? 15 : 0) + (/(because|so that|which meant|as a result|therefore)/i.test(answer) ? 11 : 0)));
    setStage(5);
  }
  if (action === 'voice') {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const status = document.querySelector('#voice-status');
    if (!SpeechRecognition) { status.textContent = 'Voice dictation is not available here. Type your answer instead.'; return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; recognition.interimResults = false;
    status.textContent = 'Listening…';
    recognition.onresult = (result) => {
      const answer = document.querySelector('#answer-text');
      answer.value = `${answer.value}${answer.value ? ' ' : ''}${result.results[0][0].transcript}`;
      demo.answer = answer.value;
      document.querySelector('#word-count').textContent = `${demo.answer.trim().split(/\s+/).length} WORDS`;
      status.textContent = 'Voice response added. Review it before continuing.';
    };
    recognition.onerror = () => { status.textContent = 'Could not start voice input. Type your answer instead.'; };
    recognition.start();
  }
  if (action === 'download') {
    const report = `Pixel Petals practice report\n\nTarget role: ${demo.role || 'Not specified'}\nResume check: ${demo.ats}/100 (prototype heuristic)\nAnswer practice score: ${demo.score}/100 (prototype heuristic)\n\nSuggested focus areas:\n${demo.issues.map((item) => `- ${item.title}: ${item.detail}`).join('\n')}\n\nPrototype only: scores are not an ATS result or hiring prediction.`;
    const url = URL.createObjectURL(new Blob([report], { type: 'text/plain' }));
    const link = document.createElement('a'); link.href = url; link.download = 'pixel-petals-practice-report.txt'; link.click(); URL.revokeObjectURL(url);
  }
});

render();
