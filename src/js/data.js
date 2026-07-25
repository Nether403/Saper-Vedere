/* ============================================================
   SAPER VEDERE — editorial content
   Hotspot coordinates are normalised (0–1) against the plate,
   measured off the Commons reproduction, not estimated.
   ============================================================ */

/* --- Chapter I: the method, restated as rules for this page --- */

export const PRINCIPLES = [
  {
    n: 'i',
    it: 'Saper vedere',
    en: 'Knowing how to see',
    source:
      'Leonardo\u2019s own phrase for the discipline he thought underlay every art and every science: not looking, but knowing how to look.',
    rule:
      'Nothing on this page explains itself before you have looked at it. Captions arrive after the image, and the annotations on the paintings stay closed until you open them. The reward for patience is the only reward offered.',
  },
  {
    n: 'ii',
    it: 'Sfumato',
    en: 'Smoke',
    source:
      'He instructed painters to let light and shade run together \u201csenza linee o segni, a guisa di fumo\u201d \u2014 without lines or borders, in the manner of smoke.',
    rule:
      'There are almost no borders in this document. Chapters dissolve into the chapters beneath them; panels are separated by gradients and shadow rather than by rules; the one hairline used anywhere fades out before it reaches its own ends.',
  },
  {
    n: 'iii',
    it: 'Proporzione',
    en: 'Proportion',
    source:
      'He drew the illustrations for Luca Pacioli\u2019s <em>De divina proportione</em> in Milan, and spent years measuring the human body against itself.',
    rule:
      'Every measurement here descends from \u03c6 = 1.618. The two columns of the page stand in golden section; the type scale climbs in powers of \u03c6; the spacing steps are Fibonacci numbers \u2014 5, 8, 13, 21, 34, 55, 89. No value in the stylesheet was chosen because it looked about right.',
  },
  {
    n: 'iv',
    it: 'Chiaroscuro',
    en: 'Light and shade',
    source:
      'He held that an object is known by the way light dies across it, and that the painter who outlines a form has already failed to observe it.',
    rule:
      'Depth is modelled with warm shadow, never with an outline or a hard drop shadow. Raised surfaces catch a thin highlight along their upper edge, the way gesso does. Nothing is pure black and nothing is pure white, because he insisted that neither occurs in nature.',
  },
  {
    n: 'v',
    it: 'Notomia',
    en: 'Anatomy',
    source:
      'He dissected perhaps thirty bodies to learn what governed the surface, and drew the same shoulder from four sides so the structure beneath could not hide.',
    rule:
      'Every image here can be stripped to its construction. The paintings carry an overlay that exposes their geometry; the machines can be reduced to the blueprint they were drawn from. The finished surface is never the only thing on offer.',
  },
  {
    n: 'vi',
    it: 'Moto',
    en: 'Motion',
    source:
      '\u201cIl moto \u00e8 causa d\u2019ogni vita\u201d \u2014 motion is the cause of all life. He studied it in water, in birds, in the tendons of the hand.',
    rule:
      'Nothing appears or disappears instantly. Every transition carries momentum into and out of itself on a single easing curve, and the machines keep turning whether or not you are watching them.',
  },
  {
    n: 'vii',
    it: 'Esperienza',
    en: 'Experience',
    source:
      'His answer to the scholars who out-argued him: experience never deceives; only our judgements deceive us, by expecting of experience what it never promised.',
    rule:
      'Claims made here are demonstrated rather than asserted. The aerial screw turns so you can see why it cannot lift itself. The refectory is walkable so you can find the vanishing point yourself instead of being told where it is.',
  },
  {
    n: 'viii',
    it: 'Il foglio',
    en: 'The sheet',
    source:
      'He left roughly seven thousand notebook pages and almost no finished treatises. Geometry, shopping lists, riddles and anatomy share a single sheet.',
    rule:
      'This is a notebook, not a monograph. It is set as folios with marginalia in the gutter, it writes backwards where he wrote backwards, and it admits in the colophon what it has left unfinished.',
  },
];

/* --- Chapter II: the paintings ------------------------------- */

export const WORKS = [
  {
    id: 'monalisa',
    plate: 'monalisa',
    title: 'Mona Lisa',
    subtitle: 'Portrait of Lisa Gherardini',
    date: 'c. 1503\u20131519',
    medium: 'Oil on poplar panel',
    size: '77 \u00d7 53 cm',
    home: 'Mus\u00e9e du Louvre, Paris',
    note:
      'He began it in Florence and never gave it up. It went with him over the Alps to France and was still in his possession when he died at Amboise, worked on across sixteen years and never declared finished.',
    seeing:
      'The famous instability of the expression is a fact about your eye, not about her face. Your central vision resolves the mouth sharply and finds it composed; your peripheral vision blurs it and finds it smiling. Look at her eyes and she smiles. Look at her mouth and the smile withdraws.',
    hotspots: [
      { x: 0.418, y: 0.325, t: 'The corner of the mouth', d: 'There is no line here. The corner is buried under dozens of translucent glazes, some of them well under a micrometre thick, so that the eye can never fix where the lip stops.' },
      { x: 0.545, y: 0.228, t: 'No eyebrows, no lashes', d: 'Probably lost to early cleaning rather than never painted \u2014 high-resolution scans have found the ghost of a single brow stroke above the left eye.' },
      { x: 0.470, y: 0.112, t: 'The veil', d: 'A gauze veil, almost invisible, runs across her hair and forehead. It is painted as a modulation of what lies beneath it rather than as a thing with its own edges.' },
      { x: 0.440, y: 0.820, t: 'The hands', d: 'The forearm rests along the chair, the hands fold at the base of a pyramid whose apex is her head. It is the most stable shape available, and everything unstable in the picture happens on top of it.' },
      { x: 0.098, y: 0.400, t: 'The left horizon', d: 'Follow the horizon out to the left edge, then to the right edge. They do not meet. The right side sits noticeably higher, and the landscape refuses to be one continuous place.' },
      { x: 0.880, y: 0.345, t: 'The right horizon', d: 'Distance here is rendered with aerial perspective: everything far away loses contrast and turns blue, because he had worked out that the air itself is not transparent.' },
      { x: 0.800, y: 0.470, t: 'The bridge', d: 'A small segmental bridge over the river on the right \u2014 one of the few unmistakably man-made things in a landscape that is otherwise geological and unpeopled.' },
    ],
  },
  {
    id: 'cenacolo',
    plate: 'cenacolo',
    title: 'The Last Supper',
    subtitle: 'Il Cenacolo',
    date: '1495\u20131498',
    medium: 'Tempera and oil on dry plaster',
    size: '460 \u00d7 880 cm',
    home: 'Santa Maria delle Grazie, Milan',
    note:
      'He refused the wet-plaster fresco technique because it dries too fast to allow revision, and painted on a dry sealed wall instead so that he could keep adjusting. It began flaking within twenty years. Almost nothing you see is his paint.',
    seeing:
      'The moment is the sentence \u201cone of you shall betray me\u201d, arriving as a shock wave. It has just reached the men nearest Christ and has not yet reached the ends of the table. The twelve are grouped in fours of three, and no group repeats another\u2019s rhythm.',
    hotspots: [
      { x: 0.494, y: 0.485, t: 'The vanishing point', d: 'Every orthogonal in the room \u2014 the ceiling coffers, the wall hangings, the table edge \u2014 converges on Christ\u2019s right temple. He is the geometric cause of the room as well as its subject.' },
      { x: 0.327, y: 0.565, t: 'Judas', d: 'Judas recoils into shadow, clutching the purse, and knocks over the salt. He is the only figure whose face is turned away from the light, and he sits among the disciples rather than opposite them, which was the older convention.' },
      { x: 0.352, y: 0.600, t: 'Peter\u2019s knife', d: 'Peter grips a knife behind his back \u2014 the violence he will use in the garden a few hours later, already in his hand.' },
      { x: 0.500, y: 0.100, t: 'The coffered ceiling', d: 'The painted room extends the real refectory. The perspective was set for a viewer standing well back and about four metres up, so from the floor the illusion is deliberately imperfect.' },
      { x: 0.500, y: 0.455, t: 'The three windows', d: 'The only light source in the painted world is behind Christ, and the pediment over the central window functions as a halo he was not given.' },
      { x: 0.470, y: 0.885, t: 'The doorway', d: 'In 1652 the monks cut a door through the wall for kitchen access and took Christ\u2019s feet with it. The painting has also survived Napoleonic troops, damp, and a bomb that removed the refectory roof in 1943.' },
    ],
  },
  {
    id: 'ermine',
    plate: 'ermine',
    title: 'Lady with an Ermine',
    subtitle: 'Cecilia Gallerani',
    date: 'c. 1489\u20131491',
    medium: 'Oil on walnut panel',
    size: '54 \u00d7 39 cm',
    home: 'Czartoryski Museum, Krak\u00f3w',
    note:
      'Cecilia Gallerani was about sixteen, and the mistress of Ludovico Sforza, who ruled Milan and paid Leonardo\u2019s wages. She was known for her Latin and her verse.',
    seeing:
      'Before this, portraits sat still and faced front. Here the body turns one way, the head another, and the eyes a third \u2014 towards something outside the frame that has just taken her attention. The animal turns with her, on the same beat.',
    hotspots: [
      { x: 0.560, y: 0.270, t: 'Three axes at once', d: 'Body, head and gaze each point somewhere different. The torsion makes a still panel read as an interrupted moment.' },
      { x: 0.540, y: 0.620, t: 'The ermine', d: 'A double pun. The ermine was Ludovico\u2019s personal emblem \u2014 he had been made a knight of the Order of the Ermine \u2014 and the Greek for the animal, <em>gal\u00e9</em>, hides her surname, Gallerani.' },
      { x: 0.340, y: 0.730, t: 'The hand', d: 'Enormous, tendon by tendon, and slightly too large for her. He was dissecting hands in these years and could not help himself.' },
      { x: 0.110, y: 0.160, t: 'The black ground', d: 'The background is not his. The original was a blue-grey wall with a window; an overpainter in the early nineteenth century blacked the whole thing out.' },
      { x: 0.165, y: 0.038, t: 'A forged signature', d: 'The inscription reads LA BELE FERONIERE / LEONARD D\u2019AWINCI. It was added by the same later hand, and it names the wrong painting.' },
    ],
  },
  {
    id: 'ginevra',
    plate: 'ginevra',
    title: 'Ginevra de\u2019 Benci',
    subtitle: '',
    date: 'c. 1474\u20131478',
    medium: 'Oil on poplar panel',
    size: '38.1 \u00d7 37 cm',
    home: 'National Gallery of Art, Washington',
    note:
      'Painted when he was around twenty-two, and the only painting by Leonardo in the Americas. The reverse carries a wreath of laurel and palm around a sprig of juniper, with the motto VIRTVTEM FORMA DECORAT \u2014 beauty adorns virtue.',
    seeing:
      'It is a portrait of someone who does not want to be painted. The pallor is deliberate, the mouth gives nothing, and the eyes are aimed just past your shoulder. Vasari said she was beautiful; the picture is more interested in saying she was unimpressed.',
    hotspots: [
      { x: 0.310, y: 0.140, t: 'Juniper', d: 'The spiky bush filling the sky is a juniper \u2014 <em>ginepro</em> \u2014 which is her name grown into a plant. The device is repeated on the back of the panel.' },
      { x: 0.560, y: 0.400, t: 'The evasion', d: 'The head faces you almost squarely, which should be the most direct pose available; the eyes then slide off to the side and cancel it.' },
      { x: 0.370, y: 0.330, t: 'Ringlets', d: 'The curls are built in translucent layers over a pale ground, an early experiment in the modelling he would spend the rest of his life refining.' },
      { x: 0.860, y: 0.600, t: 'Water and haze', d: 'Two church spires and a lake, already dissolving into blue \u2014 aerial perspective, in a picture painted before he was twenty-five.' },
      { x: 0.500, y: 0.960, t: 'The missing third', d: 'The panel was cut down at some point, probably because of damage. Her hands are gone; a surviving silverpoint study of hands at Windsor is generally taken to record them.' },
    ],
  },
  {
    id: 'battista',
    plate: 'battista',
    title: 'Saint John the Baptist',
    subtitle: '',
    date: 'c. 1508\u20131516',
    medium: 'Oil on walnut panel',
    size: '69 \u00d7 57 cm',
    home: 'Mus\u00e9e du Louvre, Paris',
    note:
      'Generally taken to be the last painting he worked on. The darkness around the figure has deepened with age, but it was always meant to be very dark.',
    seeing:
      'Everything has been removed: no landscape, no attributes beyond a reed cross, no ground to stand on. What is left is a body emerging from black and a finger pointing up, and a smile that has made a lot of viewers uncomfortable for five hundred years.',
    hotspots: [],
  },
  {
    id: 'santanna',
    plate: 'santanna',
    title: 'The Virgin and Child with Saint Anne',
    subtitle: '',
    date: 'c. 1503\u20131519',
    medium: 'Oil on poplar panel',
    size: '168 \u00d7 130 cm',
    home: 'Mus\u00e9e du Louvre, Paris',
    note:
      'Unfinished, and reworked over roughly sixteen years alongside the Mona Lisa. Freud wrote a whole book about it, most of which rests on a mistranslation.',
    seeing:
      'Three generations are stacked into one spiralling mass \u2014 Anne, Mary sitting in her lap, the child twisting away to grip a lamb. The figures make a single rotating body, and the mountains behind them dissolve into the same blue as the sky.',
    hotspots: [],
  },
  {
    id: 'rocceLouvre',
    plate: 'rocceLouvre',
    title: 'Virgin of the Rocks',
    subtitle: 'The Paris version',
    date: 'c. 1483\u20131486',
    medium: 'Oil on panel, transferred to canvas',
    size: '199 \u00d7 122 cm',
    home: 'Mus\u00e9e du Louvre, Paris',
    note:
      'Commissioned by the Confraternity of the Immaculate Conception in Milan. A long dispute over payment followed, and a second version was eventually produced. Which one hung on the altar first is still argued about.',
    seeing:
      'The grotto is geologically specific \u2014 he had looked hard at real rock \u2014 and the light comes from an opening you cannot see. The four figures are locked into a pyramid by a chain of pointing, blessing and sheltering hands.',
    hotspots: [],
  },
  {
    id: 'rocceLondon',
    plate: 'rocceLondon',
    title: 'Virgin of the Rocks',
    subtitle: 'The London version',
    date: 'c. 1495\u20131508',
    medium: 'Oil on poplar panel',
    size: '189.5 \u00d7 120 cm',
    home: 'The National Gallery, London',
    note:
      'The second version, with substantial workshop participation. Infrared has revealed a completely different composition underneath \u2014 a kneeling woman, abandoned and painted over.',
    seeing:
      'Put it beside the Paris panel. The angel has stopped pointing and stopped looking out at you; haloes and a cross have been added; the light is colder and the rock harder. It is the same invention, argued down into something more orthodox.',
    hotspots: [],
  },
  {
    id: 'annunciazione',
    plate: 'annunciazione',
    title: 'The Annunciation',
    subtitle: '',
    date: 'c. 1472\u20131476',
    medium: 'Oil and tempera on poplar panel',
    size: '98 \u00d7 217 cm',
    home: 'Galleria degli Uffizi, Florence',
    note:
      'An early work, made while he was still attached to Verrocchio\u2019s workshop. The angel\u2019s wings were originally studied from a bird; a later hand lengthened them.',
    seeing:
      'Mary\u2019s right arm is too long and the lectern sits oddly against the wall. The usual defence is that the panel was made to hang high on a right-hand wall, so that from its intended position the distortion corrects itself \u2014 a claim you can test by walking to the right of any reproduction.',
    hotspots: [],
  },
  {
    id: 'magi',
    plate: 'magi',
    title: 'Adoration of the Magi',
    subtitle: 'Abandoned',
    date: '1481\u20131482',
    medium: 'Underpainting on panel',
    size: '244 \u00d7 240 cm',
    home: 'Galleria degli Uffizi, Florence',
    note:
      'Commissioned by the monks of San Donato a Scopeto. He worked on it for months, then left for Milan to sell himself to Ludovico Sforza as a military engineer, and never came back to it.',
    seeing:
      'This is the most useful unfinished picture in Europe: you can watch him think. The ground is laid in, the crowd is blocked out in brown wash, and behind the calm foreground group a cavalry battle and a ruined staircase are still fighting for room.',
    hotspots: [],
  },
  {
    id: 'girolamo',
    plate: 'girolamo',
    title: 'Saint Jerome in the Wilderness',
    subtitle: 'Abandoned',
    date: 'c. 1480\u20131490',
    medium: 'Tempera and oil on walnut panel',
    size: '103 \u00d7 75 cm',
    home: 'Pinacoteca Vaticana, Vatican City',
    note:
      'Also unfinished. The panel was at some point cut into pieces; the story that the head was found doing service as the seat of a stool in a Roman shop is repeated everywhere and confirmed nowhere.',
    seeing:
      'The saint\u2019s neck and shoulder are worked further than anything else on the panel, and they are anatomically exact \u2014 you can identify the sternocleidomastoid. The lion in the foreground is a few sweeps of wash.',
    hotspots: [],
  },
  {
    id: 'musico',
    plate: 'musico',
    title: 'Portrait of a Musician',
    subtitle: '',
    date: 'c. 1483\u20131487',
    medium: 'Oil on walnut panel',
    size: '44.7 \u00d7 32 cm',
    home: 'Pinacoteca Ambrosiana, Milan',
    note:
      'The only surviving male portrait generally accepted as his. The sitter has been proposed as several Milanese musicians without agreement; the sheet of music in his hand was uncovered by cleaning in 1904.',
    seeing:
      'The face is finished and the body is not, which throws all the attention onto the eyes. Compare the handling of the curls with Ginevra\u2019s, painted a decade earlier \u2014 the same method, now completely fluent.',
    hotspots: [],
  },
  {
    id: 'battesimo',
    plate: 'battesimo',
    title: 'The Baptism of Christ',
    subtitle: 'With Andrea del Verrocchio',
    date: 'c. 1472\u20131475',
    medium: 'Oil and tempera on panel',
    size: '177 \u00d7 151 cm',
    home: 'Galleria degli Uffizi, Florence',
    note:
      'Verrocchio\u2019s workshop picture, with the young Leonardo given the angel at the far left and much of the landscape. Vasari\u2019s story that Verrocchio put down his brush for good on seeing it is a good story.',
    seeing:
      'You can see the join without being told. The right-hand angel is drawn in crisp tempera outlines; the left-hand one is modelled in oil, turns in space, and is lit by air. Two generations of painting are sharing one panel.',
    hotspots: [],
  },
  {
    id: 'benois',
    plate: 'benois',
    title: 'The Benois Madonna',
    subtitle: '',
    date: 'c. 1478\u20131481',
    medium: 'Oil on canvas, transferred from panel',
    size: '49.5 \u00d7 33 cm',
    home: 'State Hermitage Museum, Saint Petersburg',
    note:
      'Probably one of the \u201ctwo Virgin Marys\u201d he noted starting in 1478. It surfaced in Russia in the nineteenth century and was bought by the Hermitage in 1914.',
    seeing:
      'A young mother playing with a baby, and both of them absorbed in a flower rather than in the viewer or in their own significance. The room is dim, the window behind them is a flat grey rectangle, and nothing is holy except the attention.',
    hotspots: [],
  },
  {
    id: 'scapigliata',
    plate: 'scapigliata',
    title: 'La Scapigliata',
    subtitle: 'Head of a woman',
    date: 'c. 1506\u20131508',
    medium: 'Earth, amber and white lead on poplar panel',
    size: '24.7 \u00d7 21 cm',
    home: 'Galleria Nazionale di Parma',
    note:
      'Small, unfinished, and impossible to categorise \u2014 neither a drawing nor a painting. Its status as autograph has been questioned and, at present, is generally accepted.',
    seeing:
      'The face is brought to full resolution and the hair is left as a storm of scribbled ground. The contrast is the whole point: he is showing what finish costs by putting the finished and the unfinished a centimetre apart.',
    hotspots: [],
  },
];

/* --- Chapter III: the folios ---------------------------------- */

export const FOLIOS = [
  {
    group: 'Volare',
    en: 'On flight',
    blurb:
      'He watched birds for thirty years and filled a codex with them. The problem he never solved is that a man has perhaps a tenth of the power-to-weight ratio the job requires.',
    sheets: [
      { plate: 'vite', title: 'The aerial screw', ref: 'Paris Manuscript B, f. 83v', date: 'c. 1487\u20131490', d: 'A helical surface of starched linen meant to compress the air and climb it, like a screw entering wood. It cannot work: with the crew turning the shaft from inside, the whole machine would simply rotate the other way.' },
      { plate: 'ornitottero', title: 'A flying machine', ref: 'Paris Manuscript B', date: 'c. 1488', d: 'A wing frame of ash, cane, and fustian, worked by the pilot\u2019s arms and legs through a lattice of cords. The linkage is exact. The power source is a man, and that is the flaw.' },
      { plate: 'arno', title: 'The Arno valley', ref: 'Gabinetto dei Disegni, Uffizi', date: 'dated 5 August 1473', d: 'His earliest dated drawing, made at twenty-one, and already looking down on the world from an altitude no one had drawn from before. The hatching is left-handed, running down from upper right.' },
    ],
  },
  {
    group: 'Guerra',
    en: 'On war',
    blurb:
      'His letter to Ludovico Sforza offers nine kinds of weapon before mentioning, almost as a postscript, that he can also paint. He needed the job.',
    sheets: [
      { plate: 'carroArmato', title: 'A covered chariot', ref: 'British Museum, 1860,0616.99', date: 'c. 1487\u20131488', d: 'A conical armoured shell on four wheels, bristling with light cannon, cranked from within by eight men. As drawn, the gearing turns the front and rear wheels in opposite directions \u2014 possibly a deliberate error, possibly a draughtsman\u2019s slip.' },
      { plate: 'balestra', title: 'The giant crossbow', ref: 'Codex Atlanticus, f. 149r', date: 'c. 1486\u20131488', d: 'Twenty-four braccia across, of laminated wood for flex, drawn by a worm gear and released by a mallet blow to a pin. Never built. The drawing is a presentation piece, complete with a tiny figure supplied to prove the scale.' },
      { plate: 'carro', title: 'The self-propelled cart', ref: 'Codex Atlanticus, f. 812r', date: 'c. 1478\u20131480', d: 'Powered by two coiled leaf springs, steerable, with a programmable escapement. Built at last in 2004 by the Institute and Museum of the History of Science in Florence: it ran. Probably a theatrical device rather than a vehicle.' },
    ],
  },
  {
    group: 'Il corpo',
    en: 'On the body',
    blurb:
      'He dissected by candlelight, in cold weather so the bodies would keep, and produced anatomical drawings that were not equalled for two hundred and fifty years \u2014 and that nobody saw, because he never published them.',
    sheets: [
      { plate: 'vitruvio', title: 'Vitruvian Man', ref: 'Gallerie dell\u2019Accademia, Venice', date: 'c. 1490', d: 'Vitruvius claimed the body fits both a circle and a square. It does not, quite. Leonardo\u2019s solution is to give the two figures different centres \u2014 the navel for the circle, the groin for the square \u2014 and let the limbs move between them.' },
      { plate: 'feto', title: 'Studies of the foetus in the womb', ref: 'Royal Collection, Windsor', date: 'c. 1511', d: 'The first accurate drawing of a human foetus in the uterus. The womb is opened like a seed case. The cotyledons on the inner surface belong to a cow \u2014 he had dissected one, and borrowed the detail.' },
      { plate: 'proporzioni', title: 'Head of a man in profile, with proportions', ref: 'Royal Collection, Windsor', date: 'c. 1490', d: 'The head divided and subdivided into a grid of relations, each interval measured against the others. A face treated exactly as he treated a machine: something whose parts must be shown to agree.' },
    ],
  },
  {
    group: 'Natura',
    en: 'On nature',
    blurb:
      'Water, weather, plants, cats. He drew whatever moved, and he drew it as a system of forces rather than as a shape.',
    sheets: [
      { plate: 'acqua', title: 'Water passing obstacles', ref: 'Royal Collection, Windsor', date: 'c. 1508\u20131509', d: 'He called water <em>il vetturale della natura</em>, the carrier of nature. These are vortices drawn from observation, three and a half centuries before anyone had the mathematics for turbulence.' },
      { plate: 'diluvio', title: 'A deluge', ref: 'Royal Collection, Windsor', date: 'c. 1517\u20131518', d: 'From the last years, a series in black chalk in which the world ends. The same spiral he found in water and in hair is here at the scale of weather, tearing down mountains.' },
      { plate: 'stella', title: 'A star-of-Bethlehem and other plants', ref: 'Royal Collection, Windsor', date: 'c. 1506\u20131512', d: 'Botanically exact and compositionally impossible \u2014 the leaves spiral outward with a force no plant has. He is drawing the growth, not the specimen.' },
      { plate: 'gatti', title: 'Cats, lions and a dragon', ref: 'Royal Collection, Windsor', date: 'c. 1517\u20131518', d: 'A sheet of cats in every attitude a cat adopts, with a dragon inserted among them on the same terms, drawn from the same anatomy. He is testing whether an invented animal can be made to obey observed rules.' },
    ],
  },
  {
    group: 'Il mestiere',
    en: 'On the craft',
    blurb:
      'Studies made in service of paintings, and studies made in service of nothing in particular.',
    sheets: [
      { plate: 'panneggio', title: 'Study of drapery', ref: 'Fondation Custodia, Paris', date: 'c. 1475\u20131482', d: 'Verrocchio\u2019s workshop exercise: soak linen in clay slip, arrange it, let it set, then draw it in brush and wash on prepared linen. Pure tone, no contour \u2014 the sfumato method, learned as an apprentice drill.' },
      { plate: 'tempio', title: 'Study of a central-plan church', ref: 'Paris Manuscript B', date: 'c. 1488', d: 'Plan and elevation on one sheet, a domed core budding smaller domes. He built nothing, but Bramante was in Milan at the same time, and these sheets are part of the argument that ends at Saint Peter\u2019s.' },
      { plate: 'sforza', title: 'The Sforza monument', ref: 'Manuscript page on the casting', date: 'c. 1490s', d: 'A bronze horse three times life size. He got as far as a full-scale clay model, then the bronze was requisitioned for cannon and the French used the model for crossbow practice.' },
      { plate: 'grottesca', title: 'A grotesque head', ref: 'Drawing, pen and ink', date: 'c. 1490s', d: 'He collected faces at the edge of what a face can do. Vasari says he would follow an interesting-looking stranger across Florence for a whole day to memorise him.' },
    ],
  },
];

/* --- Chapter IV: the machines -------------------------------- */

export const MACHINES = [
  {
    id: 'vite',
    plate: 'vite',
    title: 'La vite aerea',
    en: 'The aerial screw',
    ref: 'Paris Manuscript B, f. 83v · c. 1487\u20131490',
    body:
      'A helix of starched linen over a reed frame, four braccia across, turned by a crew walking a capstan on the platform beneath. His reasoning was sound by analogy: a screw bites into wood, so a screw should bite into air and climb it.',
    verdict:
      'Turn it on. The platform rotates against the screw, because there is nothing to hold it. A crew standing on the machine can only spin themselves \u2014 the reaction torque has nowhere to go. The tail rotor that solves this arrives in 1939.',
    spin: 'The screw and its platform turn against each other',
  },
  {
    id: 'ornitottero',
    plate: 'ornitottero',
    title: 'L\u2019ornitottero',
    en: 'The flying machine',
    ref: 'Paris Manuscript B · c. 1488',
    body:
      'Ash spars, cane ribs, fustian membrane; the pilot lies prone in the frame and drives the wings through a lattice of cords and pulleys with arms and legs together. The linkage is worked out in full, down to the pulley ratios.',
    verdict:
      'The mechanism is not the problem. A trained man can sustain roughly a third of a horsepower; the wing loading here needs something closer to two. He was defeated by a number nobody could measure for another three hundred years.',
    spin: 'The wings beat, and the tips lag behind the roots',
  },
  {
    id: 'carro',
    plate: 'carro',
    title: 'Il carro semovente',
    en: 'The self-propelled cart',
    ref: 'Codex Atlanticus, f. 812r · c. 1478\u20131480',
    body:
      'Two coiled leaf springs in drums drive a train of crown gears; an escapement meters the release so the power comes out evenly rather than all at once; the steering can be preset to turn at a chosen moment. There is no seat, and no room for one.',
    verdict:
      'The one that worked. Florence\u2019s Institute and Museum of the History of Science built it in 2004 and it ran under its own power. Almost certainly a theatrical device \u2014 a self-moving prop to astonish a Medici audience \u2014 rather than any kind of vehicle.',
    spin: 'The springs unwind and the gear train drives the rear axle',
  },
];

/* --- Chapter VI: text for the mirror ------------------------- */

export const MIRROR_SAMPLES = [
  { it: 'Il moto \u00e8 causa d\u2019ogni vita', en: 'Motion is the cause of all life' },
  { it: 'L\u2019acqua \u00e8 il vetturale della natura', en: 'Water is the carrier of nature' },
  { it: 'Saper vedere', en: 'Knowing how to see' },
  { it: 'Ostinato rigore', en: 'Stubborn rigour' },
  { it: 'Non si volta chi a stella \u00e8 fisso', en: 'One who fixes on a star does not turn back' },
];

/* --- Colophon ------------------------------------------------- */

export const SOURCES = [
  { t: 'Wikimedia Commons', d: 'Every plate reproduced here is in the public domain and is loaded directly from Commons at one of its standard thumbnail sizes. Nothing has been redrawn, retouched or generated.', u: 'https://commons.wikimedia.org/wiki/Category:Leonardo_da_Vinci' },
  { t: 'Royal Collection Trust', d: 'The Windsor sheets \u2014 the anatomy, the deluges, the plants, the cats \u2014 are the largest single group of his drawings anywhere, about 550 of them, bound into an album by the 1690s.', u: 'https://www.rct.uk/collection/themes/collections/leonardo-da-vinci-drawings' },
  { t: 'Codex Atlanticus, Biblioteca Ambrosiana', d: 'Twelve volumes, 1,119 sheets, assembled by Pompeo Leoni in the 1580s. The cart and the giant crossbow are here.', u: 'https://www.leonardodigitale.com/' },
  { t: 'Paris Manuscripts, Institut de France', d: 'Twelve small notebooks, including Manuscript B with the aerial screw, the flying machine and the church studies.', u: 'https://www.leonardodigitale.com/' },
  { t: 'Martin Kemp, <em>Leonardo da Vinci: The Marvellous Works of Nature and Man</em>', d: 'The standard scholarly account, and the source relied on here wherever a dating or an attribution is contested.', u: '' },
  { t: 'Carlo Pedretti, <em>Leonardo: The Machines</em>', d: 'On the reconstructions, including the 2004 Florence build of the self-propelled cart that finally settled whether it would run.', u: '' },
];

/* Where this document knowingly departs from the record. */
export const CAVEATS = [
  'The three machines in Chapter IV are modelled from the drawings, not scanned from surviving reconstructions. Members are simplified and dimensions are proportional rather than measured.',
  'The refectory in Chapter V reconstructs the painted architecture of the Last Supper, not the real room in Santa Maria delle Grazie. The figures are the painting itself, mapped onto the rear wall.',
  'The depth layers in the Mona Lisa dive are a reading of the picture\u2019s spatial structure, separated by hand. They are an argument about how the painting is built, not a scientific stratigraphy.',
  'Quotations are given in modern English. Where a phrase is famous but its attribution is thin, it has been left out.',
];
