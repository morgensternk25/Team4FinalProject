(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const screens = ["welcome","videoScreen","postScreen","questionScreen","feedbackScreen","resultsScreen"];
  const show = (id) => screens.forEach(s => $(s).classList.toggle("hidden", s !== id));
  const now = () => new Date().toISOString();
  const sessionId = (crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const clip = Math.random() < 0.5 ? "stop" : "yield";
  const misinformation = Math.random() < 0.5 ? "misleading" : "accurate";
  const feedbackCondition = Math.random() < 0.5 ? "confirming" : "neutral";
  const sign = clip === "stop" ? "STOP" : "YIELD";
  const wrongSign = clip === "stop" ? "YIELD" : "STOP";
  const signAccurate = `The intersection had a ${sign} sign.`;
  const signMisleading = `The intersection had a ${wrongSign} sign.`;
  const directionAccurate = "A dark sedan approached from the left, while a white SUV approached from the right.";
  const directionMisleading = "A white SUV approached from the left, while a dark sedan approached from the right.";
  const questions = [
    { id:"road_sign", text:"Which road sign was visible at the intersection?", options:["STOP sign","YIELD sign","Traffic light","No sign was visible"], correct: clip === "stop" ? "STOP sign" : "YIELD sign", misinformationOptions:[wrongSign + " sign"] },
    { id:"left_vehicle", text:"Which vehicle approached the intersection from the left side of the video?", options:["A dark sedan","A white SUV","A red pickup truck","A bus"], correct:"A dark sedan", misinformationOptions:["A white SUV"] },
    { id:"right_vehicle", text:"Which vehicle approached the intersection from the right side of the video?", options:["A dark sedan","A white SUV","A red pickup truck","A bus"], correct:"A white SUV", misinformationOptions:["A dark sedan"] },
    { id:"event_outcome", text:"What happened between the two vehicles?", options:["They collided at the intersection","They stopped safely without contact","One vehicle made a U-turn","They passed through without interacting"], correct:"They collided at the intersection", misinformationOptions:[] }
  ];
  const answers = [];
  const trials = [];
  let qIndex = 0, videoWatched = false, postConfidence = null;
  let startedAt = null, videoStartedAt = null, postShownAt = null;
  const video = $("eventVideo");
  $("videoSource").src = clip === "stop" ? "accident_stop.mp4" : "accident_yield.mp4";
  video.load();

  $("beginBtn").addEventListener("click", () => {
    startedAt = now();
    show("videoScreen");
    video.play().catch(() => {
      $("videoStatus").textContent = "If the video does not start automatically, check your browser settings and reload the page.";
    });
  });
  video.addEventListener("ended", () => {
    videoWatched = true;
    $("videoStatus").textContent = "Video complete. You may continue.";
    $("videoContinue").disabled = false;
  });
  video.addEventListener("play", () => { if (!videoStartedAt) videoStartedAt = now(); });
  $("videoContinue").addEventListener("click", () => {
    if (!videoWatched) return;
    const post = misinformation === "accurate"
      ? `${signAccurate} ${directionAccurate} The vehicles collided in the intersection.`
      : `${signMisleading} ${directionMisleading} The vehicles collided in the intersection.`;
    $("socialText").textContent = post;
    postShownAt = now();
    show("postScreen");
  });
  $("postContinue").addEventListener("click", () => { qIndex = 0; renderQuestion(); show("questionScreen"); });

  function renderQuestion() {
    const q = questions[qIndex];
    $("questionCount").textContent = `Question ${qIndex + 1} of ${questions.length}`;
    $("questionProgress").style.width = `${((qIndex + 1) / questions.length) * 100}%`;
    $("questionText").textContent = q.text;
    $("answerOptions").innerHTML = "";
    $("nextQuestion").disabled = true;
    q.options.forEach((opt, i) => {
      const label = document.createElement("label");
      label.className = "option";
      const radio = document.createElement("input");
      radio.type = "radio"; radio.name = "answer"; radio.value = opt;
      radio.addEventListener("change", () => $("nextQuestion").disabled = false);
      const span = document.createElement("span"); span.textContent = opt;
      label.append(radio, span); $("answerOptions").append(label);
    });
    $("nextQuestion").textContent = qIndex === questions.length - 1 ? "Submit answers" : "Next question";
  }
  $("questionForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) return;
    const q = questions[qIndex];
    answers.push({ question_id:q.id, question:q.text, response:selected.value, correct:selected.value === q.correct, misinformation_consistent:q.misinformationOptions.includes(selected.value) });
    qIndex++;
    if (qIndex < questions.length) renderQuestion();
    else showFeedbackScreen();
  });
  function showFeedbackScreen() {
    $("feedbackMessage").textContent = feedbackCondition === "confirming"
      ? "Your responses appear highly consistent with the event details. You did a very good job identifying what happened."
      : "Your responses have been recorded. Thank you for completing the memory questions.";
    show("feedbackScreen");
  }
  $("postConfidence").addEventListener("input", () => $("postConfidenceValue").textContent = $("postConfidence").value);
  $("finishBtn").addEventListener("click", () => {
    postConfidence = Number($("postConfidence").value);
    const correctCount = answers.filter(a => a.correct).length;
    const falseMemoryCount = answers.filter(a => a.misinformation_consistent && !a.correct).length;
    const summary = {
      session_id:sessionId, started_at:startedAt, completed_at:now(),
      clip_condition:clip, sign_shown:sign, information_condition:misinformation,
      feedback_condition:feedbackCondition, post_feedback_confidence:postConfidence,
      memory_accuracy_count:correctCount, memory_accuracy_percent:correctCount/questions.length*100,
      misinformation_consistent_errors:falseMemoryCount, video_started_at:videoStartedAt,
      post_shown_at:postShownAt, video_watched_to_end:videoWatched
    };
    answers.forEach((a,i) => trials.push({
      session_id:sessionId, trial_number:i+1, clip_condition:clip,
      information_condition:misinformation, feedback_condition:feedbackCondition,
      question_id:a.question_id, question:a.question, response:a.response,
      correct_answer:questions[i].correct, correct:a.correct,
      misinformation_consistent:a.misinformation_consistent,
      post_feedback_confidence:postConfidence
    }));
    window.studySummary = summary; window.studyTrials = trials;
    $("resultSummary").innerHTML = `
      <div class="result-grid">
        <div class="metric"><strong>${correctCount} / 4</strong><span>Correct answers</span></div>
        <div class="metric"><strong>${Math.round(correctCount/4*100)}%</strong><span>Memory accuracy</span></div>
        <div class="metric"><strong>${postConfidence}</strong><span>Confidence after feedback</span></div>
      </div>`;
    show("resultsScreen");
  });

  function csvCell(value) {
    if (value === null || value === undefined) return "";
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }
  function downloadCSV(filename, rows) {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(row => headers.map(h => csvCell(row[h])).join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  $("downloadSummary").addEventListener("click", () => downloadCSV(`eyewitness_summary_${sessionId}.csv`, [window.studySummary]));
  $("downloadTrials").addEventListener("click", () => downloadCSV(`eyewitness_trials_${sessionId}.csv`, window.studyTrials));
})();
