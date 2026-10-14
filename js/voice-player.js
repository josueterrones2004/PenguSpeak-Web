(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const form = $('demo-form'), card = $('voice-player'), select = $('demo-voice');
  const note = $('demo-note'), button = $('demo-submit'), label = $('play-label');
  const actions = $('player-actions');
  const progress = $('audio-progress');
  const currentTime = $('time-current'), totalTime = $('time-total');
  const player = new Audio();
  player.preload = 'metadata';
  window.penguDemoAudio = player;
  let context, analyser, generation = 0, selectedLoaded = '';
  const format = seconds => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}` : '0:00';
  function state(playing) {
    card.classList.toggle('speaking', playing);
    label.textContent = playing ? 'Pausar muestra' : player.currentTime > 0 && !player.ended ? 'Continuar' : 'Escuchar muestra';
    button.querySelector('svg').innerHTML = playing ? '<path d="M7 5h4v14H7zm6 0h4v14h-4z"/>' : '<path d="M8 5v14l11-7z"/>';
    window.penguVoiceVisual?.(playing ? analyser : null);
  }
  function updateTimeline() {
    const duration = player.duration;
    progress.disabled = !Number.isFinite(duration) || duration <= 0;
    progress.value = progress.disabled ? 0 : Math.round(player.currentTime / duration * 1000);
    currentTime.textContent = format(player.currentTime);
    totalTime.textContent = format(duration);
  }
  const voices = [
    ['es-MX-JorgeNeural','México · Jorge'],['es-MX-DaliaNeural','México · Dalia'],
    ['es-ES-AlvaroNeural','España · Álvaro'],
    ['es-AR-TomasNeural','Argentina · Tomás'],
    ['es-BO-MarceloNeural','Bolivia · Marcelo'],['es-BO-SofiaNeural','Bolivia · Sofía'],
    ['es-CL-LorenzoNeural','Chile · Lorenzo'],['es-CL-CatalinaNeural','Chile · Catalina'],
    ['es-CR-JuanNeural','Costa Rica · Juan'],
    ['es-CU-ManuelNeural','Cuba · Manuel'],
    ['es-DO-EmilioNeural','República Dominicana · Emilio'],['es-DO-RamonaNeural','República Dominicana · Ramona'],
    ['es-GT-AndresNeural','Guatemala · Andrés'],['es-GT-MartaNeural','Guatemala · Marta'],
    ['es-HN-KarlaNeural','Honduras · Karla'],
    ['es-NI-FedericoNeural','Nicaragua · Federico'],['es-NI-YolandaNeural','Nicaragua · Yolanda'],
    ['es-PA-RobertoNeural','Panamá · Roberto'],['es-PA-MargaritaNeural','Panamá · Margarita'],
    ['es-PE-AlexNeural','Perú · Alex'],['es-PE-CamilaNeural','Perú · Camila'],
    ['es-PR-VictorNeural','Puerto Rico · Víctor']
  ];
  voices.forEach(([id,name]) => select.add(new Option(name,id)));
  const picker = $('voice-picker'), pickerButton = $('voice-picker-trigger');
  const pickerMenu = $('voice-picker-menu'), pickerValue = $('voice-picker-value');
  const optionButtons = [];
  let lastGroup = '';
  voices.forEach(([id, name]) => {
    const parts = name.split(' · ');
    const region = parts.slice(0, -1).join(' · ');
    const person = parts.at(-1);
    if (region !== lastGroup) {
      const title = document.createElement('div');
      title.className = 'voice-group-title'; title.textContent = region;
      title.setAttribute('role','presentation'); pickerMenu.appendChild(title);
      lastGroup = region;
    }
    const option = document.createElement('button');
    option.type = 'button'; option.className = 'voice-option';
    option.setAttribute('role','option'); option.setAttribute('aria-selected','false');
    option.dataset.voice = id; option.textContent = person;
    option.addEventListener('click', () => chooseVoice(id));
    pickerMenu.appendChild(option); optionButtons.push(option);
  });
  function closePicker(focus = false) {
    pickerMenu.hidden = true; pickerButton.setAttribute('aria-expanded','false');
    if (focus) pickerButton.focus();
  }
  function chooseVoice(id) {
    select.value = id;
    const found = voices.find(([key]) => key === id);
    pickerValue.textContent = found ? found[1] : 'Selecciona una voz';
    optionButtons.forEach(button => button.setAttribute('aria-selected', String(button.dataset.voice === id)));
    select.dispatchEvent(new Event('change'));
    closePicker(true);
  }
  pickerButton.addEventListener('click', () => {
    const opening = pickerMenu.hidden;
    if (opening) {
      pickerMenu.hidden = false; pickerButton.setAttribute('aria-expanded','true');
      const active = optionButtons.find(button => button.dataset.voice === select.value) || optionButtons[0];
      active?.scrollIntoView({block:'nearest'});
    } else closePicker();
  });
  picker.addEventListener('keydown', event => {
    if (event.key === 'Escape') { closePicker(true); return; }
    if (pickerMenu.hidden && ['ArrowDown','Enter',' '].includes(event.key) && event.target === pickerButton) {
      event.preventDefault(); pickerButton.click(); optionButtons[0]?.focus(); return;
    }
    if (pickerMenu.hidden) return;
    const index = optionButtons.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); optionButtons[Math.max(0,Math.min(optionButtons.length-1,index+(event.key==='ArrowDown'?1:-1)))]?.focus();
    } else if (event.key === 'Home') { event.preventDefault(); optionButtons[0]?.focus(); }
    else if (event.key === 'End') { event.preventDefault(); optionButtons.at(-1)?.focus(); }
    else if (event.key === 'Tab') closePicker();
  });
  document.addEventListener('pointerdown', event => {if (!picker.contains(event.target)) closePicker();});
  function initAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass || context) return;
    try {
      context = new AudioContextClass();
      analyser = context.createAnalyser(); analyser.fftSize = 256;
      const source = context.createMediaElementSource(player);
      source.connect(analyser); analyser.connect(context.destination);
    } catch (error) {
      // El reproductor debe seguir funcionando aunque falle la visualización.
      console.warn('Visualización de audio no disponible:', error);
      analyser = null;
    }
  }
  select.addEventListener('change', () => {
    generation++;
    player.pause();
    selectedLoaded = select.value;
    // Preparar la URL al elegir una voz, no en el primer clic de reproducir.
    // Evita la carrera entre load() y play() que ocurre en algunos Firefox.
    player.src = select.value
      ? `./assets/voice-samples/${encodeURIComponent(select.value)}.mp3`
      : '';
    if (select.value) player.load();
    else player.removeAttribute('src');
    actions.hidden = !select.value;
    state(false); updateTimeline(); note.classList.remove('error');
    note.textContent = '';
  });
  // Jorge is the default demo. The selector never starts in an empty state.
  const defaultVoice = voices[0];
  select.value = defaultVoice[0];
  pickerValue.textContent = defaultVoice[1];
  optionButtons.forEach(option => option.setAttribute('aria-selected', String(option.dataset.voice === defaultVoice[0])));
  select.dispatchEvent(new Event('change'));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!select.value) return;
    if (!player.paused) { player.pause(); state(false); return; }
    const ticket = ++generation;
    button.disabled = true;
    note.classList.remove('error'); note.textContent = '';
    try {
      // User-selected demos take priority over the automatic story audio.
      if (window.penguStoryAudio) {
        window.penguStoryAudio.pause();
        window.penguStoryAudio.currentTime = 0;
      }
      // Iniciar reproducción directamente desde el gesto del usuario.
      // No reiniciar la carga del MP3 ni crear el grafo WebAudio antes de play().
      await player.play();
      if (ticket !== generation) return;
      initAudio();
      if (context?.state === 'suspended') {
        await context.resume().catch(error => console.warn('AudioContext:', error));
      }
      if (ticket !== generation) return;
      state(true);
    } catch (error) {
      if (ticket !== generation) return;
      console.error('Error al reproducir la muestra:', error);
      state(false);
      note.textContent = 'No se pudo reproducir esta muestra. Inténtalo de nuevo.';
      note.classList.add('error');
    } finally { if (ticket === generation) button.disabled = false; }
  });
  player.addEventListener('timeupdate',updateTimeline);
  player.addEventListener('loadedmetadata',updateTimeline);
  player.addEventListener('ended',() => {state(false);updateTimeline();note.textContent = '';});
  player.addEventListener('error',() => {
    if (!select.value || !player.getAttribute('src')) return;
    state(false); button.disabled = false;
    note.textContent = 'No se pudo cargar el MP3 de esta voz.'; note.classList.add('error');
  });
  progress.addEventListener('input',() => {if(Number.isFinite(player.duration)) {player.currentTime = Number(progress.value) / 1000 * player.duration;updateTimeline();}});
})();
