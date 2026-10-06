/* ST1M PORT4L — Movement Lab content.
 * Everything here is ORIGINAL wording written for this app (definition-level summaries); the full guides, exact inputs
 * and videos live on the Apex Movement Wiki (https://apexmovement.tech) which every entry links to.
 * Community content (statuses, videos, news) is in community.json and can be refreshed from the GitHub repo. */
(function () {
  const ST = (window.ST = window.ST || {});

  // ---- actions → console command(s) used to look up the player's own binds
  ST.ACTIONS = {
    forward: { cmds: ['+forward'], def: 'W', fr: 'Avancer', en: 'Forward' },
    left: { cmds: ['+moveleft'], def: 'A', fr: 'Gauche', en: 'Left' },
    right: { cmds: ['+moveright'], def: 'D', fr: 'Droite', en: 'Right' },
    back: { cmds: ['+back'], def: 'S', fr: 'Reculer', en: 'Back' },
    jump: { cmds: ['+jump'], def: 'SPACE', fr: 'Saut', en: 'Jump' },
    crouch: { cmds: ['+duck', '+toggle_duck'], def: 'CTRL', fr: 'Accroupi', en: 'Crouch' },
    sprint: { cmds: ['+speed'], def: 'SHIFT', fr: 'Sprint', en: 'Sprint' },
    use: { cmds: ['+use'], def: 'E', fr: 'Utiliser', en: 'Use' },
    melee: { cmds: ['+melee'], def: 'V', fr: 'Mêlée', en: 'Melee' },
    ability: { cmds: ['+ability 1', '+ability 2', '+ability 3'], def: 'Q / Z / X', fr: 'Capacités', en: 'Abilities' },
    wheel: { cmds: [], def: 'MOLETTE', fr: 'Molette', en: 'Mouse wheel' },
    mouse: { cmds: [], def: 'SOURIS', fr: 'Souris (vue)', en: 'Mouse (look)' },
  };
  // typical actions per catalog group (approximation, used for the personalised "your keys" strip)
  ST.GROUP_ACTS = [
    [/^Fundamentals>Ground/, ['forward', 'sprint']], [/^Fundamentals>Slide/, ['sprint', 'crouch', 'jump']], [/^Fundamentals>Air/, ['jump', 'left', 'right', 'mouse']],
    [/^Advanced Slide/, ['sprint', 'crouch', 'jump', 'mouse']], [/^Wall Tech/, ['forward', 'jump', 'mouse']], [/^Mantle Tech/, ['forward', 'jump', 'crouch']],
    [/^Zip Tech/, ['use', 'jump', 'crouch']], [/^Lurch Tech/, ['forward', 'left', 'right', 'jump', 'wheel', 'mouse']], [/^Edge & Slant/, ['forward', 'jump', 'crouch']],
    [/^Item Interactions/, ['use', 'jump']],
  ];

  // ---- hand-written summaries: id -> {fr, en, acts?, pre?}
  ST.TECH_INFO = {
    sprint: { fr: 'Courir en maintenant la touche de sprint. C\'est la base de toute ta vitesse : presque chaque technique démarre d\'un sprint.', en: 'Running while holding the sprint key. It is the base of all your speed: almost every technique starts from a sprint.', acts: ['forward', 'sprint'] },
    jump: { fr: 'Sauter. Enchaîner les sauts trop vite réduit leur hauteur (fatigue de saut), d\'où l\'importance du timing.', en: 'Jumping. Chaining jumps too fast lowers their height (jump fatigue), which is why timing matters.', acts: ['jump'] },
    crouch: { fr: 'S\'accroupir réduit ta silhouette et sert de base à la glissade : sprint + accroupi.', en: 'Crouching shrinks your silhouette and is the base of sliding: sprint + crouch.', acts: ['crouch'] },
    strafe: { fr: 'Se déplacer latéralement (gauche/droite) sans changer la direction de la vue. Il sert à orienter tes sauts et tes duels.', en: 'Moving sideways (left/right) without changing where you look. It steers your jumps and your fights.', acts: ['left', 'right'] },
    slide: { fr: 'Sprint puis accroupi : tu glisses en conservant ta vitesse, et tu en gagnes davantage dans les descentes.', en: 'Sprint then crouch: you slide while keeping your speed, and gain more of it going downhill.', acts: ['forward', 'sprint', 'crouch'], pre: ['sprint', 'crouch'] },
    slidehop: { fr: 'Enchaîner glissade, saut et nouvelle glissade à l\'atterrissage pour garder son élan sur de longues distances.', en: 'Chaining slide, jump and a new slide on landing to keep your momentum over long distances.', acts: ['forward', 'sprint', 'crouch', 'jump'], pre: ['slide', 'jump'] },
    'air-strafe': { fr: 'En l\'air, tourner la vue dans la direction tenue (gauche ou droite) permet de courber ta trajectoire en perdant peu de vitesse.', en: 'In the air, turning your view towards the held direction (left or right) curves your path while losing little speed.', acts: ['jump', 'left', 'right', 'mouse'], pre: ['jump', 'strafe'] },
    climb: { fr: 'Face à une paroi grimpable, saute et maintiens l\'avant pour te hisser le long du mur.', en: 'Facing a climbable wall, jump and hold forward to pull yourself up along it.', acts: ['forward', 'jump'], pre: ['jump'] },
    mantle: { fr: 'Se hisser sur un rebord à portée. L\'animation de mantle est le point de départ de plusieurs techniques de vitesse, dont le superglide.', en: 'Pulling yourself onto a ledge in reach. The mantle animation is the starting point of several speed techniques, including the superglide.', acts: ['forward', 'jump'], pre: ['jump'] },
    superglide: { fr: 'Pendant un mantle, saute puis accroupis-toi exactement une frame plus tard, dans les ~0,15 dernières secondes de l\'animation : tu glisses au lieu de te hisser et gagnes de la vitesse. Utilise l\'entraîneur pour mesurer ta régularité.', en: 'During a mantle, jump then crouch exactly one frame later, within the last ~0.15 s of the animation: you slide instead of climbing and gain speed. Use the trainer to measure your consistency.', acts: ['jump', 'crouch', 'forward'], pre: ['mantle', 'jump', 'crouch'], trainer: 'superglide' },
    'tap-strafe': { fr: 'Technique de redirection en l\'air : tu combines une direction tenue, un mouvement de souris dans le même sens et de rapides appuis « avant » (souvent sur la molette) pour changer de cap sans perdre de vitesse.', en: 'An in-air redirection technique: you combine a held direction, a mouse movement the same way and quick “forward” taps (often on the mouse wheel) to change heading without losing speed.', acts: ['forward', 'left', 'right', 'wheel', 'mouse'], pre: ['air-strafe'], trainer: 'wheel', pack: 'tapstrafe' },
    lurch: { fr: 'Famille de techniques qui exploitent de courts gains de vitesse lors des changements de direction. Les bases sont la clé pour tap strafe et les techniques voisines.', en: 'A family of techniques exploiting short speed gains when changing direction. The basics are the key to tap strafing and related techniques.', acts: ['forward', 'left', 'right', 'jump', 'wheel', 'mouse'], pre: ['air-strafe'] },
    'zip-jump': { fr: 'Sauter depuis une tyrolienne pour conserver ton élan à la sortie. Une base pour toutes les techniques de zipline.', en: 'Jumping off a zipline to keep your momentum on exit. A base for all zipline techniques.', acts: ['use', 'jump'], pre: ['jump'] },
    'wall-push': { fr: 'Prendre appui sur un mur pour changer de direction ou te repousser lors d\'une escalade.', en: 'Pushing off a wall to change direction or kick yourself away while climbing.', acts: ['forward', 'jump', 'mouse'], pre: ['climb'] },
  };

  // ---- learning path: stages of catalog names (resolved to ids at runtime, unknown names are ignored)
  ST.STAGES = [
    { id: 's1', fr: ['Fondations', 'Les gestes de base : courir, sauter, s\'accroupir, glisser.'], en: ['Foundations', 'The basic moves: run, jump, crouch, slide.'], techs: ['Sprint', 'Jump', 'Crouch', 'Strafe', 'Slide', 'Jump slide', 'Slide jump', 'Bunnyhop'] },
    { id: 's2', fr: ['Glisse & air', 'Garder son élan et contrôler sa trajectoire en l\'air.'], en: ['Slide & air', 'Keep your momentum and control your path in the air.'], techs: ['Slidehop', 'Edge slide', 'Quick slide', 'Air strafe', 'Skydive', 'Skydive cancel'] },
    { id: 's3', fr: ['Murs', 'Grimper, courir sur les murs et rebondir.'], en: ['Walls', 'Climb, wall-run and bounce.'], techs: ['Climb', 'Sideways climb - Wallrun', 'Wall push', 'Wallhop', 'Basic Wallbounce', 'Mini-bounce'] },
    { id: 's4', fr: ['Mantle', 'Maîtriser les rebords, base du superglide.'], en: ['Mantle', 'Master ledges, the base of the superglide.'], techs: ['Mantle', 'Auto mantle', 'Insta-mantle', 'Mantle cancel', 'Mantle hop'] },
    { id: 's5', fr: ['Vitesse', 'Les techniques qui font la différence en duel.'], en: ['Speed', 'The techniques that make a difference in fights.'], techs: ['Superglide', 'Mantle boost', 'Lurch', 'Tap strafe', 'Momentumshift', 'Zip jump', 'Super jump'] },
    { id: 's6', fr: ['Avancé', 'Réservé à ceux qui veulent tout maîtriser.'], en: ['Advanced', 'For those who want to master everything.'], techs: ['Insta-Glide', 'Glide-boost', 'Backwards Superglide', 'Glide-bounce', 'Bounce-Chain', 'Lurch strafing'] },
  ];
  ST.XP = { basic: 10, easy: 20, concept: 5, medium: 40, hard: 80, master: 150, mystery: 0, removed: 0 };
  ST.LEVELS = [[0, 'Rookie', 'Rookie'], [60, 'Mover', 'Mover'], [160, 'Slider', 'Slider'], [320, 'Glider', 'Glider'], [560, 'Striker', 'Striker'], [900, 'Phantom', 'Phantom'], [1400, 'Apex Mover', 'Apex Mover']];

  // ---- legends: mobility 1-5 (our own subjective rating), tags for the quiz. mob:null = not rated yet
  ST.LEGENDS = [
    { n: 'Octane', mob: 5, tags: ['rush', 'ground', 'easy'], fr: 'Stim et jump pad : vitesse au sol et sauts en hauteur, très accessible.', en: 'Stim and jump pad: ground speed and big jumps, very approachable.' },
    { n: 'Pathfinder', mob: 5, tags: ['flank', 'vertical', 'hard'], fr: 'Grappin : un plafond de technique très élevé (swing, élan, ziplines).', en: 'Grapple: a very high skill ceiling (swings, momentum, ziplines).' },
    { n: 'Horizon', mob: 4, tags: ['zone', 'vertical', 'medium'], fr: 'Contrôle aérien et gravity lift pour la verticalité.', en: 'Air control and gravity lift for verticality.' },
    { n: 'Wraith', mob: 4, tags: ['flank', 'teleport', 'medium'], fr: 'Phase et portails pour se repositionner vite.', en: 'Phase and portals to reposition fast.' },
    { n: 'Valkyrie', mob: 4, tags: ['rush', 'vertical', 'medium'], fr: 'Jetpack : mobilité aérienne et engagement par le haut.', en: 'Jetpack: aerial mobility and engages from above.' },
    { n: 'Vantage', mob: 3, tags: ['flank', 'vertical', 'hard'], fr: 'Echo pour se déplacer et prendre de la hauteur.', en: 'Echo to travel and gain height.' },
    { n: 'Revenant', mob: 4, tags: ['rush', 'walls', 'hard'], fr: 'Escalade de murs et techniques de grimpe avancées.', en: 'Wall climbing and advanced climb techniques.' },
    { n: 'Rampart', mob: 3, tags: ['zone', 'walls', 'hard'], fr: 'Couverts amplifiés utilisables comme appuis de mouvement.', en: 'Amped cover usable as movement platforms.' },
    { n: 'Mad Maggie', mob: 3, tags: ['rush', 'ground', 'medium'], fr: 'Passif de vitesse et wrecking ball pour foncer.', en: 'Speed passive and wrecking ball to charge in.' },
    { n: 'Loba', mob: 3, tags: ['flank', 'teleport', 'medium'], fr: 'Bracelet de téléportation pour franchir les obstacles.', en: 'Teleport bracelet to clear obstacles.' },
    { n: 'Bangalore', mob: 3, tags: ['rush', 'ground', 'easy'], fr: 'Bonus de vitesse quand on te tire dessus, fumée pour couvrir.', en: 'Speed bonus when shot at, smoke for cover.' },
    { n: 'Ash', mob: 3, tags: ['rush', 'ground', 'medium'], fr: 'Passif de déplacement et engagements rapides.', en: 'Movement passive and quick engages.' },
    { n: 'Mirage', mob: 3, tags: ['flank', 'support', 'easy'], fr: 'Leurres pour tromper l\'adversaire et se déplacer en sécurité.', en: 'Decoys to fool opponents and move safely.' },
    { n: 'Newcastle', mob: 2, tags: ['support', 'zone', 'medium'], fr: 'Protège ses coéquipiers et se déplace avec ses boucliers.', en: 'Protects teammates and moves with his shields.' },
    { n: 'Crypto', mob: 2, tags: ['support', 'flank', 'medium'], fr: 'Drone de reconnaissance, déplacements via le drone.', en: 'Recon drone, movement through the drone.' },
    { n: 'Fuse', mob: 2, tags: ['rush', 'zone', 'easy'], fr: 'Explosifs et engagements en force.', en: 'Explosives and forceful engages.' },
    { n: 'Lifeline', mob: 2, tags: ['support', 'easy'], fr: 'Soutien simple avec drone de soin.', en: 'Simple support with a healing drone.' },
    { n: 'Seer', mob: 2, tags: ['support', 'easy'], fr: 'Reconnaissance et contrôle d\'information.', en: 'Recon and information control.' },
    { n: 'Bloodhound', mob: 2, tags: ['support', 'easy'], fr: 'Reconnaissance et traque.', en: 'Recon and tracking.' },
    { n: 'Conduit', mob: 2, tags: ['support', 'easy'], fr: 'Soutien énergétique, mobilité modérée.', en: 'Energy support, moderate mobility.' },
    { n: 'Caustic', mob: 1, tags: ['zone', 'easy'], fr: 'Contrôle de zone par le gaz.', en: 'Area control with gas.' },
    { n: 'Gibraltar', mob: 1, tags: ['zone', 'easy'], fr: 'Bouclier et soutien défensif.', en: 'Shield and defensive support.' },
    { n: 'Wattson', mob: 1, tags: ['zone', 'easy'], fr: 'Défense de zone par clôtures et pylône.', en: 'Zone defence with fences and pylon.' },
    { n: 'Axle', mob: null, tags: [], fr: 'Techniques listées au wiki : Drift, Nitro Gate, Kickstart. Fiche à compléter.', en: 'Techniques listed on the wiki: Drift, Nitro Gate, Kickstart. Entry to be completed.' },
    { n: 'Alter', mob: null, tags: [], fr: 'Techniques listées au wiki : Nexus, Void passage. Fiche à compléter.', en: 'Techniques listed on the wiki: Nexus, Void passage. Entry to be completed.' },
    { n: 'Sparrow', mob: null, tags: [], fr: 'Techniques listées au wiki : grimpe passive, double saut, wall launch. Fiche à compléter.', en: 'Techniques listed on the wiki: climb passive, double jump, wall launch. Entry to be completed.' },
  ];

  // ---- legend quiz: each answer adds tag weights / a mobility preference
  ST.QUIZ = [
    { fr: 'Comment aimes-tu engager un combat ?', en: 'How do you like to start a fight?', a: [
      { fr: 'Foncer dessus', en: 'Rush in', tags: ['rush'] }, { fr: 'Les contourner', en: 'Flank around', tags: ['flank'] },
      { fr: 'Tenir une zone', en: 'Hold an area', tags: ['zone'] }, { fr: 'Soutenir l\'équipe', en: 'Support the team', tags: ['support'] }] },
    { fr: 'Quelle mobilité veux-tu ?', en: 'How mobile do you want to be?', a: [
      { fr: 'Maximum, je veux voler', en: 'Maximum, I want to fly', mob: 5 }, { fr: 'Élevée', en: 'High', mob: 4 },
      { fr: 'Moyenne', en: 'Medium', mob: 3 }, { fr: 'Peu, je préfère rester posé', en: 'Little, I prefer to stay grounded', mob: 1 }] },
    { fr: 'Ce qui te fait vibrer ?', en: 'What excites you most?', a: [
      { fr: 'Les hauteurs et le grappin', en: 'Heights and grapples', tags: ['vertical'] }, { fr: 'La vitesse au sol', en: 'Ground speed', tags: ['ground'] },
      { fr: 'Les téléportations', en: 'Teleports', tags: ['teleport'] }, { fr: 'Les murs et la grimpe', en: 'Walls and climbing', tags: ['walls'] }] },
    { fr: 'Ton rapport à la difficulté ?', en: 'Your relationship with difficulty?', a: [
      { fr: 'Je veux être efficace tout de suite', en: 'I want to be effective right away', tags: ['easy'], w: 2 }, { fr: 'Prêt à apprendre un peu', en: 'Happy to learn a bit', tags: ['medium'], w: 2 },
      { fr: 'Plafond de skill élevé, je m\'entraîne', en: 'High skill ceiling, I train', tags: ['hard'], w: 2 }] },
  ];
})();
