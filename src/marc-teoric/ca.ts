import type { Framework } from './tipus';

// Text original. Les traduccions (es, eu, gl, en, fr) en segueixen l’estructura paràgraf per paràgraf.
const text: Framework = {
  intro: [
    'LECAA Docs vol ajudar les persones que fan servir comunicació augmentativa i alternativa (CAA) a aprendre a escriure i a escriure amb més autonomia. Aquest text explica, a partir de la recerca, per què l’app ofereix cada opció i per què totes es poden activar, combinar o desactivar segons la persona.',
    'Les opcions es basen en la recerca sobre l’alfabetització de les persones usuàries de CAA (Light i McNaughton, 2012; Light et al., 2025), en la recerca sobre els processadors de textos amb veu (MacArthur, 2009) i en la recerca sobre l’aprenentatge de la lectura i l’escriptura. Els apartats següents expliquen en quina evidència es basa cada decisió.',
  ],
  sections: [
    {
      title: 'L’escriptura és per a tothom',
      paras: [
        'Les persones amb necessitats complexes de comunicació solen tenir menys oportunitats d’aprendre a llegir i a escriure, però amb una instrucció adequada i amb accés a eines d’escriptura poden progressar (Light i McNaughton, 2012; Erickson i Koppenhaver, 2020). Escriure dona accés a una comunicació oberta: permet dir qualsevol cosa, no només el vocabulari que algú ha previst en un tauler o en un comunicador (Beukelman i Light, 2020). Per a qui no pot escriure a mà, el teclat, físic o en pantalla, fa de «llapis alternatiu» i posa totes les lletres a l’abast (Erickson i Koppenhaver, 2020).',
        'Les dificultats no s’expliquen només per la discapacitat. Les expectatives baixes, la manca de formació dels professionals i uns materials que demanen respostes orals, com dir el so d’una lletra o llegir en veu alta, deixen sovint aquestes persones sense ensenyament de la lectura i l’escriptura (Light et al., 2025). Segons les dades que recullen Collins et al. (2024), al voltant del 90 % de les persones amb poca parla arriben a l’edat adulta sense prou alfabetització funcional per llegir i escriure de manera autònoma.',
        'En canvi, quan reben una instrucció adaptada que no exigeix parlar, infants i adults amb autisme, paràlisi cerebral, síndrome de Down o discapacitat intel·lectual que fan servir CAA aprenen correspondències entre lletres i sons, consciència fonològica i descodificació (Light et al., 2025). Una revisió sistemàtica d’estudis de cas únic amb infants amb discapacitat intel·lectual usuaris de CAA hi va trobar efectes positius constants en les correspondències entre lletres i sons (Ulriksen et al., 2026b). En un estudi amb 123 alumnes suecs amb discapacitat intel·lectual lleu, moderada o greu que necessitaven CAA, l’alumnat de tots els nivells va millorar a un ritme semblant en consciència fonològica i en lectura de paraules (Palmqvist et al., 2025).',
      ],
    },
    {
      title: 'Escriure és transcriure i compondre',
      paras: [
        'Els models cognitius de l’escriptura hi distingeixen tres processos: planificar què es vol dir, convertir les idees en text i revisar-lo (Hayes i Flower, 1980). Mentre s’aprèn, la transcripció, és a dir, trobar les lletres i escriure les paraules, ocupa una part important de la memòria de treball i deixa menys recursos per pensar el missatge (McCutchen, 1996; Graham i Harris, 2000). Les opcions de LECAA Docs volen reduir aquesta càrrega: la veu confirma el que s’ha escrit, el pictograma confirma el significat de la paraula i la lletra s’adapta a la manera de llegir de cada persona.',
      ],
    },
    {
      title: 'Sentir el que s’escriu: la lletra, la paraula i la frase',
      paras: [
        'Qui no pot parlar no pot dir-se en veu alta el que escriu per comprovar-ho. La veu de l’app fa aquesta funció: torna en so el text escrit perquè la persona el compari amb el que volia escriure. En un estudi amb un alumne amb autisme sense parla funcional, la sortida de veu, sola o combinada amb la retroacció escrita, va fer més eficient l’aprenentatge de l’ortografia que la retroacció escrita sola (Schlosser et al., 1998). En la rèplica amb quatre infants, tots van aprendre les paraules, però la retroacció més eficient no va ser la mateixa per a tots: els autors la relacionen amb un perfil més visual, que aprofita més la retroacció escrita, o més auditiu, que aprofita més la retroacció oral (Schlosser i Blischak, 2004). Per això l’app no imposa cap modalitat: el feedback de lletra, de paraula i de frase es pot combinar o desactivar del tot.',
        'Parlar ajuda, però no és imprescindible per prendre consciència dels sons de la llengua. Infants amb paràlisi cerebral que no parlaven van mostrar consciència fonològica de síl·labes, d’inici i rima i de fonemes, i van reconèixer pseudoparaules escrites tan bé com els que parlaven; només els van costar més les tasques que demanen retenir la paraula i repetir-la mentalment, com manipular-ne els fonemes o decidir si els noms de dos dibuixos rimen, cosa que els autors atribueixen a la dificultat de fer servir el bucle articulatori (Card i Dodd, 2006). Segons un estudi que recullen els mateixos autors, infants amb paràlisi cerebral sense parla van escriure millor les paraules quan en sentien el nom que quan només en veien el dibuix. En alumnes amb discapacitat intel·lectual usuaris de CAA, el nombre de paraules que podien dir amb la parla es relacionava amb el coneixement de les correspondències entre lletres i sons i amb la síntesi de sons, mentre que el vocabulari del comunicador no hi tenia relació (Ulriksen et al., 2026a). I una revisió de la recerca conclou que, per escriure paraules, les persones que no es poden basar en la parla es poden beneficiar que l’adult torni a dir la paraula o de la sortida de veu (Light et al., 2025). La veu de LECAA Docs fa aquesta funció de veu externa: diu la lletra, la paraula o la frase que la persona no es pot dir.',
        'La hipòtesi de l’autoaprenentatge explica per què és útil sentir la paraula acabada: cada vegada que una paraula escrita es converteix en so, l’aprenent té una oportunitat de fixar-ne la forma ortogràfica i de connectar-la amb la pronúncia i el significat (Share, 1995; Ehri, 2014). A més, practicar l’escriptura inventada, és a dir, escriure les paraules tal com se senten, va ajudar infants de parvulari a aprendre a llegir més paraules que altres formes d’entrenament (Ouellette i Sénéchal, 2008), i l’escriptura inventada a parvulari prediu la lectura i l’ortografia del curs següent (Ouellette i Sénéchal, 2017).',
        'La frase sencera, que l’app llegeix en escriure el punt o en prémer Intro, dona suport a la revisió (Hayes i Flower, 1980). En un estudi amb 33 estudiants universitaris amb dificultats d’aprenentatge, escoltar el propi text amb síntesi de veu els va permetre detectar-hi un percentatge d’errors significativament més alt, tot i que la lectura en veu alta per part d’una altra persona va continuar sent el més eficaç (Raskind i Higgins, 1995).',
      ],
    },
    {
      title: 'El nom o el so de cada lletra',
      paras: [
        'El coneixement del nom de les lletres és un dels millors predictors de l’aprenentatge de la lectura (Foulin, 2005), i la instrucció explícita del nom i del so de les lletres millora aquest coneixement (Piasta i Wagner, 2010). El nom de la lletra («be», «ce trencada») és estable i és el que fan servir l’escola i la família per lletrejar; el so és el que permet llegir i escriure paraules noves. L’app ofereix totes dues opcions, però no alhora, per no duplicar la informació ni allargar l’espera entre tecla i tecla.',
        'En les ortografies transparents, com la castellana, l’aprenentatge inicial de les correspondències entre lletres i sons és molt més ràpid que en les opaques, com l’anglesa (Seymour et al., 2003). Això suggereix que, en llengües amb correspondències regulars, el so de cada lletra és una pista especialment útil per escriure. Els sons s’han enregistrat amb veu humana perquè les veus sintètiques no pronuncien bé els sons aïllats. En la parla els sons es coarticulen, de manera que pronunciar un fonema aïllat sempre el distorsiona una mica, i consonants com /p/, /t/ o /l/ són especialment difícils de dir soles (Garriga Ferriol, 2003a); per això és important que els pronunciï una persona.',
        'A més, en català la correspondència entre lletres i sons no és sempre d’un a un: un mateix so es pot escriure amb lletres diferents, com /s/ amb s, ss, c o ç, i una mateixa lletra, com la g, pot representar sons diferents (Garriga Ferriol, 2003a). El so de la lletra orienta, però no resol totes les decisions ortogràfiques; per això convé combinar-lo amb el nom de la lletra i amb la lectura de la paraula sencera.',
        'Les correspondències entre lletres i sons són l’habilitat amb una evidència més consistent en infants amb discapacitat intel·lectual usuaris de CAA, i les intervencions que les combinen amb la síntesi i la segmentació de sons donen guanys més amplis (Ulriksen et al., 2026b). En el programa de consciència fonològica adaptat al català per Garriga Ferriol (2003b), el treball oral desemboca en activitats amb lletres i de lletreig, perquè l’entrenament és més eficaç quan les correspondències entre sons i grafies es treballen alhora. Escriure sentint el so de cada lletra, o lletrejar una paraula amb els sons, és una manera d’aplicar aquestes correspondències, que l’adult pot combinar amb l’ensenyament de la síntesi i la segmentació de sons.',
      ],
    },
    {
      title: 'Llegir en veu alta i lletrejar',
      paras: [
        'La lectura a demanda ressalta la frase i, quan el motor de veu ho permet, la paraula que se sent, de manera que el text arriba alhora per la vista i per l’oïda. Aquesta presentació bimodal va millorar la comprensió dels lectors menys hàbils respecte de la presentació per un sol canal (Montali i Lewandowski, 1996), i una metaanàlisi sobre la síntesi de veu i altres ajuts de lectura en veu alta en alumnat amb dificultats de lectura va trobar-hi un efecte positiu sobre la comprensió, de mida petita a moderada (0,35; Wood et al., 2018). Ressaltar el text al mateix temps que se sent segueix el principi de contigüitat temporal de l’aprenentatge multimèdia (Mayer, 2021).',
        'Quan se selecciona una sola paraula, apareix l’opció «Lletreja», que ressalta cada lletra per ordre mentre en diu el nom, i avisa de les majúscules, o bé, en català i en castellà i segons la configuració, mentre en diu el so amb veu enregistrada. Fa visible l’estructura ortogràfica de la paraula, hi combina retroacció escrita i oral, com en els estudis de Schlosser i Blischak (2004), i permet comprovar com s’escriu una paraula sense dependre d’una altra persona. Lletrejar amb els sons s’assembla a la funció de descodificació d’alguns comunicadors dissenyats per facilitar el pas a la lectoescriptura, que ressalta cada lletra mentre la veu en diu el so (Holyfield et al., 2026): en vuit estudis amb 32 infants, adolescents i adults amb discapacitats del desenvolupament usuaris de CAA, va millorar la descodificació i el coneixement de les correspondències entre lletres i sons (Light et al., 2025). Lletrejar amb els noms aprofita el coneixement del nom de les lletres, un dels millors predictors de l’aprenentatge de la lectura (Foulin, 2005).',
      ],
    },
    {
      title: 'Les veus',
      paras: [
        'La intel·ligibilitat de la veu sintètica varia d’un sintetitzador a un altre i és més baixa per als infants que per als adults (Mirenda i Beukelman, 1987; Drager et al., 2010). Per això l’app permet triar entre les veus instal·lades al dispositiu i veus neuronals gratuïtes que funcionen sense connexió, i ajustar-ne la velocitat, el to i el volum. Convé triar la veu provant-la amb la persona mateixa.',
      ],
    },
    {
      title: 'Els pictogrames',
      paras: [
        'Els pictogrames poden ajudar o fer nosa segons l’objectiu. Per entendre un text, l’evidència és mixta: en un estudi, els símbols van millorar la comprensió de textos d’adults amb discapacitat intel·lectual (Jones et al., 2007), però en un altre no la van millorar respecte del text sol (Poncelas i Murphy, 2007); fins i tot persones adultes sense discapacitat van interpretar amb poc encert pictogrames aïllats que representaven enunciats abstractes (Benson-Goldberg i Erickson, 2020).',
        'Per aprendre a reconèixer la paraula escrita, en canvi, la imatge pot captar l’atenció i alentir l’aprenentatge (Samuels, 1970). En un estudi amb sis alumnes, cinc van aprendre més de pressa les paraules presentades sense imatge (Didden et al., 2000); en un altre, l’alumnat va tenir més èxit quan relacionava activament imatges i paraules escrites que quan les paraules es presentaven acompanyades de la imatge (Fossett i Mirenda, 2006). Els símbols poden ajudar a aprendre paraules quan es combinen amb estratègies d’ensenyament específiques (Sheehy, 2002), però, en general, Erickson et al. (2010) recomanen no aparellar imatges amb les paraules que l’alumne ha d’aprendre a llegir o a escriure.',
        'Les revisions recents hi afegeixen dues dades. No hi ha evidència que conèixer els símbols gràfics ajudi directament a adquirir les habilitats de la lectoescriptura convencional, com la consciència fonològica, les correspondències entre lletres i sons o la codificació, perquè, a diferència de les lletres, els pictogrames no tenen cap relació amb els sons de la paraula (Light et al., 2025). I l’etiqueta de text fixa que molts comunicadors posen damunt del símbol pot interferir en l’aprenentatge de la paraula escrita (Caron et al., 2021).',
        'LECAA Docs aplica aquestes dades de quatre maneres. El pictograma apareix quan la paraula ja s’ha escrit: la persona escriu a partir de les lletres i el pictograma li confirma el significat. Per defecte, no n’hi ha per a articles, preposicions, conjuncions i pronoms febles, de manera que l’ajuda visual es concentra en les paraules amb contingut. Es poden amagar amb un sol botó. I la configuració permet que s’esvaeixin al cap d’uns segons o que només es vegin en tocar la paraula, perquè la imatge competeixi menys amb el text i l’ajuda visual es pugui anar retirant. La mateixa idea, que la paraula escrita sigui al centre, és la dels comunicadors que mostren el text de manera dinàmica quan se selecciona un pictograma: combinada amb la sortida de veu, va millorar el reconeixement de paraules escrites de cinc participants amb autisme (Caron et al., 2018) i de quatre nois de 9 a 18 anys amb autisme greu i molt poca parla (Caron et al., 2021); en conjunt, en nou estudis amb 37 participants, el 89 % van millorar en la lectura de paraules (Light et al., 2025). Caron et al. (2021) proposen, a més, anar retirant els pictogrames a mesura que la persona aprèn les paraules, per facilitar el pas a l’escriptura alfabètica; l’opció d’esvair els pictogrames respon a aquesta proposta.',
        'Els documents desats i impresos porten tots els pictogrames perquè altres lectors, com la família, els puguin aprofitar, tenint present que l’efecte dels símbols sobre la comprensió varia d’una persona a una altra (Jones et al., 2007; Poncelas i Murphy, 2007).',
      ],
    },
    {
      title: 'Els teclats i l’accés motriu',
      paras: [
        'LECAA Docs no té teclat propi: funciona amb el teclat físic i amb el teclat en pantalla de cada sistema. Així la persona escriu amb el mateix mètode d’accés que fa servir a les altres aplicacions i amb els ajustos d’accessibilitat del sistema que ja té configurats, d’acord amb el principi d’ajustar les eines a les capacitats i les necessitats de cada persona que guia la intervenció en CAA (Beukelman i Light, 2020). Això és especialment important perquè les dificultats motrius provoquen errors de teclat característics (Trewin i Pain, 1999).',
        'Escriure amb el mètode d’accés habitual també importa per valorar el que la persona sap. En una revisió de les proves de coneixement de l’escrit fetes amb alumnat usuari de CAA, més del 40 % demanaven una manera de respondre diferent de la que l’alumne feia servir per comunicar-se, i els autors recomanen que la persona hi pugui participar amb el seu sistema i el seu mètode d’accés habituals (Collins et al., 2024).',
      ],
    },
    {
      title: 'La protecció del tecleig',
      paras: [
        'L’opció de no acceptar tecles mentre sona el feedback fa que cada missatge de veu s’escolti sencer abans de la tecla següent. Evita que la informació se superposi i, d’acord amb la teoria de la càrrega cognitiva i amb el principi de contigüitat temporal, facilita que cada so es relacioni amb el que s’acaba d’escriure (Sweller, 1988; Mayer, 2021).',
      ],
    },
    {
      title: 'Els tipus de lletra',
      paras: [
        'L’app inclou diverses lletres amb formes clares perquè cada persona faci servir la que llegeixi millor. Les lletres especials per a la dislèxia no han mostrat beneficis: OpenDyslexic no va millorar la velocitat ni la precisió lectora d’alumnat amb dislèxia (Wery i Diliberto, 2017), i Dyslexie tampoc no va millorar la lectura d’infants amb dislèxia o sense (Kuster et al., 2018). OpenDyslexic s’inclou perquè algunes persones la prefereixen, no perquè millori la lectura. En canvi, separar més les lletres sí que va millorar la lectura d’infants amb dislèxia (Zorzi et al., 2012). La lletra lligada (Playwrite ES, model escolar) permet treballar a la pantalla amb el mateix model de lletra de l’aula, per coherència amb la pràctica escolar.',
      ],
    },
    {
      title: 'Els documents i el seguiment',
      paras: [
        'Cada document es desa amb el dia en què es va començar i el de l’últim canvi, de manera que es pot veure com evoluciona l’escriptura de cada persona. Una metaanàlisi va trobar que la retroacció sobre l’escriptura millora la qualitat dels textos, tant si la donen els adults (efecte mitjà de 0,87) com els companys (0,58), la mateixa persona (0,62) o l’ordinador (0,38), mentre que el seguiment del progrés per si sol no la va millorar de manera apreciable (Graham et al., 2015). Un recull de textos datats és, per tant, útil sobretot com a base per donar retroacció. A més, com que hi ha poques proves estandarditzades de lectura i escriptura adaptades a les persones que no parlen (Collins et al., 2024; Ulriksen et al., 2026b), els textos que la persona escriu amb el seu mètode d’accés habitual són una font d’informació valuosa per valorar-ne l’evolució. Els documents es desen només al dispositiu i no s’envien enlloc.',
      ],
    },
    {
      title: 'Sis idiomes',
      paras: [
        'L’app funciona en català, castellà, basc, gallec, anglès i francès, cadascun amb els seus noms de lletres, veus, pictogrames i configuració, de manera que es pot escriure en la llengua de l’escola i en la de casa. Segons la hipòtesi de la interdependència lingüística, les habilitats acadèmiques i de lectoescriptura desenvolupades en una llengua es poden transferir a l’altra (Cummins, 1979).',
      ],
    },
    {
      title: 'L’app, l’ensenyament i la família',
      paras: [
        'LECAA Docs està pensat per practicar l’escriptura dins d’un ensenyament explícit i sistemàtic, que és el més eficaç amb els usuaris de CAA: l’adult modela l’habilitat, guia la pràctica, dona retroacció correctiva i ofereix moltes oportunitats de practicar (Ulriksen et al., 2026b; Babb i Caron, 2026). Les aplicacions hi ajuden com a complement. En un estudi amb 123 alumnes amb discapacitat intel·lectual, els autors conclouen que les aplicacions digitals poden donar suport a l’ensenyament de la lectura si s’usen amb la guia del professorat (Palmqvist et al., 2025), i les funcions de text dinàmic dels comunicadors estan pensades per complementar l’ensenyament (Caron et al., 2021; Light et al., 2025).',
        'Combinar diverses habilitats també dona bons resultats. En l’estudi suec, el grup que va combinar un programa fonològic i un de comprensió va millorar més en consciència fonològica que els altres (Palmqvist et al., 2025), i quatre infants usuaris de CAA van millorar alhora en síntesi de sons, descodificació i lectura de paraules freqüents amb una aplicació d’alfabetització que les mares, formades a distància, feien servir cinc dies a la setmana a casa (Babb i Caron, 2026). Aquest darrer estudi mostra que la família pot fer un paper actiu si rep formació i acompanyament; Garriga Ferriol (2003a) també destaca el paper de la família com a facilitadora de l’aprenentatge de la lectura. Que LECAA Docs funcioni igual a casa i a l’escola, en un navegador i sense instal·lació, facilita aquesta continuïtat.',
      ],
    },
    {
      title: 'Cada opció es pot ajustar',
      paras: [
        'El disseny universal per a l’aprenentatge recomana oferir diverses maneres de percebre la informació, d’implicar-s’hi i d’expressar-se (CAST, 2024). Com que la resposta a cada tipus d’ajuda varia d’una persona a una altra (Schlosser i Blischak, 2004), totes les opcions de LECAA Docs es poden configurar per separat, i cada idioma en guarda la seva configuració. Es recomana triar-les a partir de l’observació sistemàtica de cada persona i revisar-les a mesura que avança. Tampoc no hi ha un mètode únic que serveixi per a tothom: en l’alfabetització de l’alumnat sord, per exemple, Garriga Ferriol (2003a) conclou que el camí s’ha de triar a partir de la situació de cada alumne.',
      ],
    },
  ],
  references: 'Referències',
};

export default text;
