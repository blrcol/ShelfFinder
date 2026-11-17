/*
 * ShelfFinder — Case-Geyer Library data
 * ---------------------------------------
 * All x/y coordinates are in "map units": each floor plan image is scaled to
 * 1000 units wide (taken from Colgate's published floor plans).
 * Map "up" is assumed to be north (the South Entrance is at the bottom of Level 5).
 *
 * To change the layout: edit nodes/edges per floor. Nodes are walkable points
 * (aisle intersections, stairs, elevators, stack blocks). Edges are walkable
 * straight lines between nodes, written as "nodeA-nodeB".
 */
window.SF_DATA = {
  library: 'Case-Geyer Library · Colgate University',

  // Live Colgate catalog: paste the Apps Script web-app URL here (it is not secret;
  // the API key stays inside the script). Leave empty to use demo data only.
  // Shared database for librarians (Firebase Realtime Database + Email/Password sign-in).
  // Neither value is secret: database.rules.json decides who may read and write.
  // Leave both empty to keep every change on the device it was made on.
  firebase: { databaseURL: '', apiKey: '' },

  liveCatalogUrl: 'https://script.google.com/macros/s/AKfycbxSTzyb6mNUGsgtwYbaozWuZAjIxZssW_-qDjBeVV6n79pQB3YyHHkDMyeiLU-tyLHhsQ/exec',
  // "Open in catalog" links (Colgate Primo VE). {mms} = the record's MMS ID, {q} = search text.
  // A book that came from the live catalog opens its own record (holds and requests are there);
  // anything else opens a catalog search.
  catalogRecordUrl: 'https://colgate.primo.exlibrisgroup.com/discovery/fulldisplay?docid=alma{mms}&vid=01COLGATE_INST:01COLGATE_INST&lang=en',
  catalogSearchUrl: 'https://colgate.primo.exlibrisgroup.com/discovery/search?query=any,contains,{q}&vid=01COLGATE_INST:01COLGATE_INST&lang=en',
  // Interlibrary loan (Colgate's ILLiad). {q} = the search text, filled in as the book title.
  // People sign in with their Colgate portal account; books arrive at the Access Services Desk, Level 3.
  illRequestUrl: 'https://colgate.illiad.oclc.org/illiad/illiad.dll/OpenURL?genre=book&title={q}',

  floors: {
    L5: {
      name: 'Level 5', order: 5, about: 'South Entrance · Hieber Café · Learning Commons',
      nodes: {
        ent:   [395, 625, 'South Entrance'],
        sw:    [330, 605],
        nw:    [330, 470],
        stair: [395, 478, 'Main Stair'],
        c470:  [470, 470, 'Learning Commons Desk', 'help'],
        w400:  [330, 400],
        wE:    [180, 400],
        elevW: [140, 383, 'West Elevator'],
        n345:  [470, 345],
        e345:  [630, 345],
        elevE: [658, 383, 'East Elevator'],
        cafe:   [255, 545, 'Hieber Café (585)', 'food'],
        w345:   [330, 345],
        lab501: [215, 300, 'Cronin Learning Lab (501)', 'tech'],
        n200:   [470, 200],
        rr525:  [400, 105, 'Hieber Reading Room (525)', 'study'],
        dl548:  [560, 300, 'Grover Hargrove Digital Learning & Media Center (548)', 'tech'],
        wc5:    [262, 392, 'Restrooms · Level 5', 'restroom']
      },
      edges: ['ent-sw', 'sw-nw', 'nw-stair', 'nw-c470', 'nw-w400', 'w400-wE', 'wE-elevW',
              'c470-n345', 'n345-e345', 'e345-elevE',
              'sw-cafe', 'w400-w345', 'w345-lab501', 'n345-n200', 'n200-rr525', 'n345-dl548', 'w400-wc5']
    },

    L4: {
      name: 'Level 4', order: 4, about: 'Stacks: LC classes J–PS and TR–Z',
      nodes: {
        a195_205: [205, 195], a195_280: [280, 195], a195_405: [405, 195], a195_530: [530, 195], a195_610: [610, 195],
        a292_205: [205, 292], a292_280: [280, 292], a292_405: [405, 292], a292_530: [530, 292], a292_610: [610, 292],
        a390_205: [205, 390], a390_280: [280, 390], a390_405: [405, 390], a390_530: [530, 390], a390_610: [610, 390],
        a525_205: [205, 525], a525_280: [280, 525], a525_405: [405, 525], a525_530: [530, 525], a525_610: [610, 525],
        b_PNPQ: [250, 145, 'PN–PQ stacks'], b_PQ: [565, 145, 'PQ stacks'],
        b_PGPN: [280, 250, 'PG–PN stacks'], b_PQPR: [530, 250, 'PQ–PR stacks'],
        b_KZPE: [280, 340, 'KZ–PE stacks'], b_PRPS: [530, 340, 'PR–PS stacks'],
        b_JKF:  [280, 462, 'J–KF stacks'],  b_PSZA: [530, 462, 'PS, TR–ZA stacks'],
        b_NNX:  [405, 560, 'N–NX stacks'],
        stair: [405, 425, 'Main Stair'],
        elevW: [178, 335, 'West Elevator'], elevE: [632, 335, 'East Elevator'],
        siloW: [160, 140, 'West Silo Stair'], siloE: [650, 140, 'East Silo Stair'],
        wc4:   [200, 240, 'Restrooms · Level 4', 'restroom'],
        n415:  [170, 78, 'Niederauer Seminar (415)', 'study'], n438: [650, 78, 'Niederauer Seminar (438)', 'study'],
        n70w:  [300, 72], rr4: [405, 60, 'Level 4 Reading Area', 'study'],
        gv440: [628, 188, 'Group Viewing Room (440)', 'tech'],
        lasr:  [218, 600, 'LASR Observation Deck', 'special']
      },
      edges: [
        'a195_205-a195_280', 'a195_280-a195_405', 'a195_405-a195_530', 'a195_530-a195_610',
        'a292_205-a292_280', 'a292_280-a292_405', 'a292_405-a292_530', 'a292_530-a292_610',
        'a390_205-a390_280', 'a390_280-a390_405', 'a390_405-a390_530', 'a390_530-a390_610',
        'a525_205-a525_280', 'a525_280-a525_405', 'a525_405-a525_530', 'a525_530-a525_610',
        'a195_205-a292_205', 'a292_205-a390_205', 'a390_205-a525_205',
        'a195_610-a292_610', 'a292_610-a390_610', 'a390_610-a525_610',
        'a195_405-a292_405', 'a292_405-a390_405', 'a390_405-stair',
        'a195_280-b_PNPQ', 'a195_280-b_PGPN', 'b_PGPN-a292_280', 'a292_280-b_KZPE', 'b_KZPE-a390_280', 'a390_280-b_JKF', 'b_JKF-a525_280',
        'a195_530-b_PQ', 'a195_530-b_PQPR', 'b_PQPR-a292_530', 'a292_530-b_PRPS', 'b_PRPS-a390_530', 'a390_530-b_PSZA', 'b_PSZA-a525_530',
        'b_NNX-a525_280', 'b_NNX-a525_405', 'b_NNX-a525_530',
        'elevW-a292_205', 'elevW-a390_205', 'elevE-a292_610', 'elevE-a390_610',
        'siloW-a195_205', 'siloE-a195_610',
        'a292_205-wc4', 'siloW-n415', 'siloE-n438', 'a195_280-n70w', 'n70w-rr4', 'a195_610-gv440', 'a525_205-lasr'
      ]
    },

    L3: {
      name: 'Level 3', order: 3, about: 'West & East Entrances · Circulation · Reference · Periodicals',
      nodes: {
        wEnt:  [160, 388, 'West Entrance'],
        c220:  [220, 388], c290: [290, 388], c412: [412, 388], c607: [607, 388],
        eEnt:  [685, 392, 'East Entrance'],
        elevW: [220, 348, 'West Elevator'], elevE: [607, 348, 'East Elevator'],
        stair: [412, 425, 'Main Stair'],
        refA:  [240, 230], ref: [275, 185, 'Reference A–Z'],
        m330:  [412, 330], per: [430, 290, 'Current Periodicals', 'study'],
        circ:  [290, 450, 'Circulation Desk', 'help'],
        siloW: [178, 180, 'West Silo Stair'], e230: [592, 225], siloE: [640, 180, 'East Silo Stair'],
        c540:  [540, 388], itd: [545, 452, 'IT Service Desk', 'help'],
        mrr:   [430, 195, 'Martin Reference Reading Room', 'study'], drr: [430, 105, 'Dempsey Reading Room', 'study'],
        wc3:   [222, 262, 'Restrooms · Level 3', 'restroom'],
        pk345: [645, 295, 'Picker Classroom / Lab (345)', 'tech'],
        media: [440, 470, 'Media Listening & Viewing Room (365)', 'tech'],
        // From the labels on Colgate's Level 3 floor plan
        maps:  [415, 148, 'Maps'], atl: [407, 225, 'Atlases'], mform: [471, 482, 'Microforms']
      },
      edges: ['wEnt-c220', 'c220-c290', 'c290-c412', 'c412-c540', 'c540-c607', 'c607-eEnt', 'c540-itd', 'per-mrr', 'mrr-drr', 'refA-wc3', 'elevE-pk345', 'c412-media',
              'c220-elevW', 'c607-elevE', 'c412-stair', 'elevW-refA', 'refA-ref', 'refA-siloW',
              'c412-m330', 'm330-per', 'c290-circ', 'elevE-e230', 'e230-siloE',
              'per-atl', 'atl-mrr', 'mrr-maps', 'maps-drr', 'media-mform']
    },

    L1: {
      name: 'Level 1', order: 1, about: 'U.S. Government Documents (SuDoc) · Burke Studios',
      nodes: {
        elevW: [190, 395, 'West Elevator'], elevE: [607, 395, 'East Elevator'],
        siloW: [160, 215, 'West Silo Stair'], siloE: [640, 215, 'East Silo Stair'],
        w265: [215, 265], cW: [225, 410], cGov: [290, 410], cE: [585, 410], e265: [615, 262],
        gov: [290, 360, 'U.S. Government Documents Collection (109)'],
        burke: [130, 380, 'Burke Video & Audio Studios (100)', 'tech'], wc1: [190, 322, 'Restrooms · Level 1', 'restroom']
      },
      edges: ['elevW-cW', 'cW-cGov', 'cGov-gov', 'cGov-cE', 'cE-elevE', 'siloW-w265', 'w265-cW', 'siloE-e265', 'e265-cE', 'cW-burke', 'w265-wc1']
    },

    L2: {
      name: 'Level 2', order: 2, about: 'Stacks: LC classes A–H',
      nodes: {
        a238_215: [215, 238], a238_300: [300, 238], a238_400: [400, 238], a238_505: [505, 238], a238_590: [590, 238],
        a340_215: [215, 340], a340_300: [300, 340], a340_400: [400, 340], a340_505: [505, 340], a340_590: [590, 340],
        a435_215: [215, 435], a435_300: [300, 435], a435_400: [400, 435], a435_505: [505, 435], a435_590: [590, 435],
        a530_215: [215, 530], a530_300: [300, 530], a530_505: [505, 530], a530_590: [590, 530],
        b_DSE:  [300, 188, 'DS–E stacks'],  b_EF:   [505, 188, 'E–F stacks'],
        b_DDS:  [300, 288, 'D–DS stacks'],  b_FHD:  [505, 288, 'F–HD stacks'],
        b_BPD:  [300, 390, 'BP–D stacks'],  b_HDHQ: [505, 392, 'HD–HQ stacks'],
        b_ABP:  [300, 483, 'A–BP stacks'],  b_HQHX: [505, 490, 'HQ–HX stacks'],
        stair: [400, 470, 'Main Stair'],
        elevW: [180, 385, 'West Elevator'], elevE: [620, 385, 'East Elevator'],
        siloW: [160, 192, 'West Silo Stair'], siloE: [640, 192, 'East Silo Stair'],
        wc2:   [205, 290, 'Restrooms · Level 2', 'restroom'],
        n130w: [215, 132], trr: [400, 125, 'Theriot Reading Room', 'study'],
        awad:  [140, 330, 'Awad Digital Media Suite (200)', 'tech'],
        spc:   [470, 585, 'Loesch Special Collections & Archives (275)', 'special']
      },
      edges: [
        'a238_215-a238_300', 'a238_300-a238_400', 'a238_400-a238_505', 'a238_505-a238_590',
        'a340_215-a340_300', 'a340_300-a340_400', 'a340_400-a340_505', 'a340_505-a340_590',
        'a435_215-a435_300', 'a435_300-a435_400', 'a435_400-a435_505', 'a435_505-a435_590',
        'a530_215-a530_300', 'a530_505-a530_590',
        'a238_215-a340_215', 'a340_215-a435_215', 'a435_215-a530_215',
        'a238_590-a340_590', 'a340_590-a435_590', 'a435_590-a530_590',
        'a238_300-b_DSE', 'a238_300-b_DDS', 'b_DDS-a340_300', 'a340_300-b_BPD', 'b_BPD-a435_300', 'a435_300-b_ABP', 'b_ABP-a530_300',
        'a238_505-b_EF', 'a238_505-b_FHD', 'b_FHD-a340_505', 'a340_505-b_HDHQ', 'b_HDHQ-a435_505', 'a435_505-b_HQHX', 'b_HQHX-a530_505',
        'a435_400-stair',
        'elevW-a340_215', 'elevW-a435_215', 'elevE-a340_590', 'elevE-a435_590',
        'siloW-a238_215', 'siloE-a238_590',
        'a340_215-wc2', 'a238_215-n130w', 'n130w-trr', 'elevW-awad', 'a530_505-spc'
      ]
    }
  },

  // Vertical connections between floors
  connectors: [
    { id: 'stair', name: 'Main Stair',      kind: 'stairs',   floors: ['L2', 'L3', 'L4', 'L5'] },
    { id: 'elevW', name: 'West Elevator',   kind: 'elevator', floors: ['L1', 'L2', 'L3', 'L4', 'L5'] },
    { id: 'elevE', name: 'East Elevator',   kind: 'elevator', floors: ['L1', 'L2', 'L3', 'L4', 'L5'] },
    { id: 'siloW', name: 'West Silo Stair', kind: 'stairs',   floors: ['L1', 'L2', 'L3', 'L4'] },
    { id: 'siloE', name: 'East Silo Stair', kind: 'stairs',   floors: ['L1', 'L2', 'L3', 'L4'] }
  ],

  entrances: ['L5:ent', 'L3:wEnt', 'L3:eEnt'],

  // Live catalog: how Alma library/location names map to places in the building.
  // "match" is a case-insensitive pattern tested against the library and location
  // codes and names. First match wins; anything unmatched is placed by call number.
  // Check the real codes in Librarian > Live Colgate catalog > Load locations.
  catalogRules: [
    { match: 'cooley|science library', status: 'elsewhere', note: 'This copy is in Cooley Science Library, not Case-Geyer.' },
    { match: 'online resource', status: 'online' },
    { match: 'lasr|automated storage|remote storage', status: 'lasr' },
    { match: 'reserve', node: 'L3:circ', label: 'Course reserves at the Circulation Desk' },
    { match: 'special coll|\\bscua\\b|archive|rare|loesch', node: 'L2:spc', label: 'Loesch Special Collections & Archives' },
    // Colgate location codes gdoc / govr / gpam = "CASE Document", "Docs Oversize", "Docs Pamphlets"
    { match: 'gov(ernment)? ?doc|sudoc|federal doc|\\| (gdoc|govr|gpam) \\|', node: 'L1:gov', label: 'U.S. Government Documents Collection' },
    // Not on an open shelf (desk, ILL, displays, new books, conservation, withdrawn, unassigned): staff can fetch it
    { match: 'circulation desk|display|spotlight|new books|conservation|faculty review|withdrawn|unassigned|resource sharing', node: 'L3:circ', label: 'Ask at the Circulation Desk' },
    // Places labelled on the Level 3 floor plan (checked Nov 17, 2026)
    { match: 'atlas', node: 'L3:atl', label: 'Atlases, by the Martin Reference Reading Room' },
    { match: '\\bmaps?\\b', node: 'L3:maps', label: 'Maps, between the reading rooms' },
    { match: 'micro(form|film|fiche)', node: 'L3:mform', label: 'Microforms, beside the Main Stair' },
    // Best guesses, not on the floor plan: printed indexes with Reference, newspapers with Current Periodicals
    { match: '\\bindex(es)?\\b', node: 'L3:ref', label: 'Indexes, with Reference A–Z' },
    { match: 'newspaper', node: 'L3:per', label: 'Newspapers, with Current Periodicals' },
    { match: '\\bref(erence)?\\b', node: 'L3:ref', label: 'Reference A–Z' },
    { match: 'periodical|journal|serial|current issues', node: 'L3:per', label: 'Current Periodicals' },
    { match: 'media|dvd|video|audio|cd-rom', node: 'L3:media', label: 'Media Listening & Viewing Room' }
  ],

  // Place categories (4th value on a node). Nodes with a category show up under "Places".
  placeTypes: {
    restroom: { name: 'Restrooms', icon: '🚻', nearest: true },
    help:     { name: 'Help desks', icon: '💬' },
    study:    { name: 'Reading & study', icon: '📖' },
    food:     { name: 'Café', icon: '☕' },
    tech:     { name: 'Labs & media', icon: '🖥️' },
    special:  { name: 'Special collections', icon: '🏛️' }
  },

  // Stack blocks, from the yellow call-number signs on the floor plans.
  // rect = [x, y, width, height] used to highlight the block on the map.
  blocks: [
    { id: 'A-BP',   floor: 'L2', from: 'A',  to: 'BP', node: 'b_ABP',  rect: [225, 445, 150, 77] },
    { id: 'BP-D',   floor: 'L2', from: 'BP', to: 'D',  node: 'b_BPD',  rect: [225, 345, 150, 83] },
    { id: 'D-DS',   floor: 'L2', from: 'D',  to: 'DS', node: 'b_DDS',  rect: [225, 245, 150, 85] },
    { id: 'DS-E',   floor: 'L2', from: 'DS', to: 'E',  node: 'b_DSE',  rect: [225, 145, 150, 83] },
    { id: 'E-F',    floor: 'L2', from: 'E',  to: 'F',  node: 'b_EF',   rect: [425, 145, 157, 83] },
    { id: 'F-HD',   floor: 'L2', from: 'F',  to: 'HD', node: 'b_FHD',  rect: [425, 245, 157, 85] },
    { id: 'HD-HQ',  floor: 'L2', from: 'HD', to: 'HQ', node: 'b_HDHQ', rect: [425, 345, 157, 83] },
    { id: 'HQ-HX',  floor: 'L2', from: 'HQ', to: 'HX', node: 'b_HQHX', rect: [425, 445, 157, 77] },
    { id: 'J-KF',   floor: 'L4', from: 'J',  to: 'KF', node: 'b_JKF',  rect: [215, 400, 160, 118] },
    { id: 'KZ-PE',  floor: 'L4', from: 'KZ', to: 'PE', node: 'b_KZPE', rect: [215, 300, 160, 82] },
    { id: 'PG-PN',  floor: 'L4', from: 'PG', to: 'PN', node: 'b_PGPN', rect: [215, 205, 160, 82] },
    { id: 'PN-PQ',  floor: 'L4', from: 'PN', to: 'PQ', node: 'b_PNPQ', rect: [215, 100, 85, 90] },
    { id: 'PQ',     floor: 'L4', from: 'PQ', to: 'PQ', node: 'b_PQ',   rect: [515, 100, 90, 90] },
    { id: 'PQ-PR',  floor: 'L4', from: 'PQ', to: 'PR', node: 'b_PQPR', rect: [435, 205, 170, 82] },
    { id: 'PR-PS',  floor: 'L4', from: 'PR', to: 'PS', node: 'b_PRPS', rect: [435, 300, 170, 82] },
    { id: 'PS',     floor: 'L4', from: 'PS', to: 'PS', node: 'b_PSZA', rect: [435, 400, 170, 118], label: 'PS, TR–ZA' },
    { id: 'TR-ZA',  floor: 'L4', from: 'TR', to: 'ZA', node: 'b_PSZA', rect: [435, 400, 170, 118], label: 'PS, TR–ZA' },
    { id: 'N-NX',   floor: 'L4', from: 'N',  to: 'NX', node: 'b_NNX',  rect: [215, 535, 390, 58] },
    { id: 'GOVDOCS', floor: 'L1', from: null, to: null, node: 'gov', rect: [218, 300, 125, 140], label: 'U.S. Government Documents Collection' },
    { id: 'REF',    floor: 'L3', from: null, to: null, node: 'ref',    rect: [252, 140, 48, 72], label: 'Reference A–Z' }
  ],

  // Physical ranges that have been cataloged shelf-by-shelf (the pilot).
  // line = where the range sits on the map [x1, y1, x2, y2].
  ranges: [
    { id: 'L2-R01', block: 'A-BP', name: 'Range 1 · west end of A–BP', faces: ['W', 'E'],
      sections: 5, shelves: 7, sectionCm: 91, line: [232, 448, 232, 519] }
  ],

  // DEMO catalog. Call numbers are typical LC numbers for these titles —
  // verify against the Colgate catalog and replace with your pilot inventory.
  // SAMPLE books for demos: made-up shelf positions in the Level 2 pilot range. When the live
  // catalog is connected they are hidden from student search (add ?demo=1 to the URL to show them).
  books: [
    { id: 1,  title: 'Meditations', author: 'Marcus Aurelius', call: 'B580 .A3', status: 'shelf', loc: { range: 'L2-R01', face: 'W', section: 1, shelf: 2, pos: 18 } },
    { id: 2,  title: 'Being and Time', author: 'Martin Heidegger', call: 'B3279.H48 S413', status: 'shelf', loc: { range: 'L2-R01', face: 'W', section: 2, shelf: 3, pos: 55 } },
    { id: 3,  title: 'Beyond Good and Evil', author: 'Friedrich Nietzsche', call: 'B3313 .J43', status: 'shelf', loc: { range: 'L2-R01', face: 'W', section: 2, shelf: 4, pos: 40 } },
    { id: 4,  title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', call: 'BF441 .K238', status: 'shelf', loc: { range: 'L2-R01', face: 'W', section: 4, shelf: 1, pos: 30 } },
    { id: 5,  title: 'The Interpretation of Dreams', author: 'Sigmund Freud', call: 'BF1078 .F72', status: 'shelf', loc: { range: 'L2-R01', face: 'W', section: 4, shelf: 5, pos: 12 } },
    { id: 6,  title: 'The Analects', author: 'Confucius', call: 'B128.C8 E5', status: 'shelf', loc: { range: 'L2-R01', face: 'W', section: 5, shelf: 6, pos: 70 } },
    { id: 7,  title: 'The Power of Myth', author: 'Joseph Campbell', call: 'BL304 .C36', status: 'shelf', loc: { range: 'L2-R01', face: 'E', section: 2, shelf: 2, pos: 20 } },
    { id: 8,  title: 'The Varieties of Religious Experience', author: 'William James', call: 'BR110 .J3', status: 'shelf' },
    { id: 9,  title: 'The Guns of August', author: 'Barbara W. Tuchman', call: 'D530 .T8', status: 'shelf' },
    { id: 10, title: 'SPQR: A History of Ancient Rome', author: 'Mary Beard', call: 'DG209 .B375', status: 'shelf' },
    { id: 11, title: 'The Souls of Black Folk', author: 'W. E. B. Du Bois', call: 'E185.5 .D81', status: 'shelf' },
    { id: 12, title: 'The Wealth of Nations', author: 'Adam Smith', call: 'HB161 .S65', status: 'shelf' },
    { id: 13, title: 'Guns, Germs, and Steel', author: 'Jared Diamond', call: 'HM206 .D48', status: 'shelf' },
    { id: 14, title: 'The Communist Manifesto', author: 'Karl Marx & Friedrich Engels', call: 'HX276 .M27', status: 'shelf' },
    { id: 15, title: 'The Prince', author: 'Niccolò Machiavelli', call: 'JC143 .M3', status: 'shelf' },
    { id: 16, title: 'Democracy in America', author: 'Alexis de Tocqueville', call: 'JK216 .T7', status: 'shelf' },
    { id: 17, title: 'Anna Karenina', author: 'Leo Tolstoy', call: 'PG3366 .A6', status: 'shelf' },
    { id: 18, title: 'Don Quixote', author: 'Miguel de Cervantes', call: 'PQ6323 .A1', status: 'shelf' },
    { id: 19, title: 'Pride and Prejudice', author: 'Jane Austen', call: 'PR4034 .P7', status: 'shelf' },
    { id: 20, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', call: 'PS3511.I9 G7', status: 'out' },
    { id: 21, title: 'Beloved', author: 'Toni Morrison', call: 'PS3563.O8749 B4', status: 'cart' },
    { id: 22, title: 'The Story of Art', author: 'E. H. Gombrich', call: 'N5300 .G643', status: 'lasr' },
    { id: 23, title: 'On Photography', author: 'Susan Sontag', call: 'TR183 .S65', status: 'shelf' },
    { id: 24, title: 'Silent Spring', author: 'Rachel Carson', call: 'QH545.P4 C38', status: 'shelf' },
    { id: 26, title: 'Statistical Abstract of the United States', author: 'U.S. Census Bureau', call: 'C 3.134:2012', status: 'shelf' },
    { id: 25, title: 'Oxford English Dictionary', author: 'Oxford University Press', call: 'REF PE1625 .O87', status: 'shelf' }
  ]
};
