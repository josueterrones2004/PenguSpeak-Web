(() => {
  'use strict';
  const section = document.getElementById('intro-story');
  const typing = document.getElementById('story-typing');
  const message = document.getElementById('story-message');
  const connector = document.getElementById('story-connector');
  const speak = document.getElementById('story-speak');
  const mascot = document.getElementById('story-mascot');
  const retry = document.getElementById('story-audio-retry');
  const clock = document.getElementById('story-message-time');
  const chatList = document.getElementById('story-message-list');
  const chatBody = chatList?.closest('.story-chat-body');

  // Shuffle only the people already in the channel. Heather is always the incoming message.
  if (chatList && message) {
    const peers = [...chatList.querySelectorAll('.story-previous')];
    for (let i = peers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [peers[i], peers[j]] = [peers[j], peers[i]];
    }
    peers.forEach(peer => chatList.insertBefore(peer, message));
  }
  const voices = ['es-MX-JorgeNeural','es-ES-AlvaroNeural','es-AR-TomasNeural','es-BO-MarceloNeural','es-CL-LorenzoNeural','es-CR-JuanNeural','es-CU-ManuelNeural','es-DO-EmilioNeural','es-GT-AndresNeural','es-NI-FedericoNeural','es-PA-RobertoNeural','es-PE-AlexNeural','es-PR-VictorNeural','es-MX-DaliaNeural','es-BO-SofiaNeural','es-CL-CatalinaNeural','es-DO-RamonaNeural','es-GT-MartaNeural','es-HN-KarlaNeural','es-NI-YolandaNeural','es-PA-MargaritaNeural','es-PE-CamilaNeural'];
  const chosen = voices[Math.floor(Math.random() * voices.length)];
  const audio = new Audio(`./assets/story-samples/${chosen}.mp3`);
  audio.preload = 'auto';
  window.penguStoryAudio = audio;
  const visitTime = new Intl.DateTimeFormat('es-MX', {hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
  clock.textContent = visitTime;
  document.querySelectorAll('.story-peer-time').forEach(time => {time.textContent = visitTime;});
  let started = false;
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  function stopVisual() {speak.classList.remove('is-speaking');mascot.classList.remove('is-speaking');}
  function updateStoryButton() {
    const playing = !audio.paused && !audio.ended;
    retry.textContent = playing ? '❚❚ Pausar demostración' : '▶ Reproducir demostración';
    retry.setAttribute('aria-pressed', String(playing));
  }
  audio.addEventListener('playing', () => {
    speak.classList.add('is-speaking');
    mascot.classList.add('is-speaking');
    updateStoryButton();
  });
  audio.addEventListener('pause', () => {stopVisual();updateStoryButton();});
  audio.addEventListener('ended', () => {stopVisual();audio.currentTime = 0;updateStoryButton();});
  audio.addEventListener('error', () => {
    stopVisual();
    updateStoryButton();
    retry.textContent = 'No se pudo cargar la muestra';
  });
  async function playStory() {
    if (retry.disabled) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    // Only a deliberate click starts the recording; never play on scroll or a timer.
    if (window.penguDemoAudio && !window.penguDemoAudio.paused) {
      window.penguDemoAudio.pause();
    }
    try { await audio.play(); }
    catch (error) {
      stopVisual();
      retry.textContent = 'No se pudo reproducir · Reintentar';
    }
  }
  retry.addEventListener('click', playStory);
  function start() {
    if (started) return;
    started = true;
    later(() => {
      const previous = [...chatList.querySelectorAll('.story-previous')];
      const before = previous.map(el => el.getBoundingClientRect().top);
      typing.hidden = true;
      message.hidden = false;
      chatList.classList.add('has-heather');
      chatBody?.classList.add('is-sent');
      requestAnimationFrame(() => {
        previous.forEach((el, index) => {
          const distance = before[index] - el.getBoundingClientRect().top;
          if (Math.abs(distance) > 1 && el.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            el.animate([{transform:`translateY(${distance}px)`},{transform:'translateY(0)'}], {duration:550,easing:'cubic-bezier(.22,1,.36,1)'});
          }
        });
      });
    }, 8000);
    later(() => {connector.classList.add('is-transferring');}, 8420);
    later(() => {
      connector.classList.remove('is-transferring');
      connector.classList.add('is-complete');
      retry.disabled = false;
      retry.classList.add('is-ready', 'just-ready');
      retry.addEventListener('animationend', () => retry.classList.remove('just-ready'), {once:true});
    }, 9220);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {start();observer.disconnect();}
    }, {threshold:0.25});
    observer.observe(section);
  } else start();
  window.addEventListener('pagehide', () => {timers.forEach(clearTimeout);audio.pause();});
})();
