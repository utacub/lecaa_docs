import type { Framework } from './tipus';

// Tradución do texto catalán (ca.ts), parágrafo por parágrafo.
const text: Framework = {
  intro: [
    'LECAA Docs quere axudar as persoas que usan comunicación aumentativa e alternativa (CAA) a aprender a escribir e a escribir con máis autonomía. Este texto explica, a partir da investigación, por que a app ofrece cada opción e por que todas se poden activar, combinar ou desactivar segundo a persoa.',
    'As opcións baséanse na investigación sobre a alfabetización das persoas usuarias de CAA (Light e McNaughton, 2012; Light et al., 2025), na investigación sobre os procesadores de textos con voz (MacArthur, 2009) e na investigación sobre a aprendizaxe da lectura e da escrita. Os apartados seguintes explican en que evidencia se basea cada decisión.',
  ],
  sections: [
    {
      title: 'A escrita é para todo o mundo',
      paras: [
        'As persoas con necesidades complexas de comunicación adoitan ter menos oportunidades de aprender a ler e a escribir, pero cunha instrución axeitada e con acceso a ferramentas de escrita poden progresar (Light e McNaughton, 2012; Erickson e Koppenhaver, 2020). Escribir dá acceso a unha comunicación aberta: permite dicir calquera cousa, non só o vocabulario que alguén previu nun taboleiro ou nun comunicador (Beukelman e Light, 2020). Para quen non pode escribir a man, o teclado, físico ou en pantalla, fai de «lapis alternativo» e pon todas as letras ao seu alcance (Erickson e Koppenhaver, 2020).',
        'As dificultades non se explican só pola discapacidade. As expectativas baixas, a falta de formación dos profesionais e uns materiais que piden respostas orais, como dicir o son dunha letra ou ler en voz alta, deixan a miúdo estas persoas sen ensino da lectura e da escrita (Light et al., 2025). Segundo os datos que recollen Collins et al. (2024), arredor do 90 % das persoas con pouca fala chegan á idade adulta sen abonda alfabetización funcional para ler e escribir de maneira autónoma.',
        'En cambio, cando reciben unha instrución adaptada que non esixe falar, nenos e adultos con autismo, parálise cerebral, síndrome de Down ou discapacidade intelectual que usan CAA aprenden correspondencias entre letras e sons, conciencia fonolóxica e decodificación (Light et al., 2025). Unha revisión sistemática de estudos de caso único con nenos con discapacidade intelectual usuarios de CAA atopou efectos positivos constantes nas correspondencias entre letras e sons (Ulriksen et al., 2026b). Nun estudo con 123 alumnos suecos con discapacidade intelectual leve, moderada ou grave que necesitaban CAA, o alumnado de todos os niveis mellorou a un ritmo semellante en conciencia fonolóxica e en lectura de palabras (Palmqvist et al., 2025).',
      ],
    },
    {
      title: 'Escribir é transcribir e compoñer',
      paras: [
        'Os modelos cognitivos da escrita distinguen tres procesos: planificar que se quere dicir, converter as ideas en texto e revisalo (Hayes e Flower, 1980). Mentres se aprende, a transcrición, é dicir, atopar as letras e escribir as palabras, ocupa unha parte importante da memoria de traballo e deixa menos recursos para pensar a mensaxe (McCutchen, 1996; Graham e Harris, 2000). As opcións de LECAA Docs queren reducir esta carga: a voz confirma o que se escribiu, o pictograma confirma o significado da palabra e a letra adáptase á maneira de ler de cada persoa.',
      ],
    },
    {
      title: 'Oír o que se escribe: a letra, a palabra e a frase',
      paras: [
        'Quen non pode falar non pode dicirse en voz alta o que escribe para comprobalo. A voz da app cumpre esta función: devolve en son o texto escrito para que a persoa o compare co que quería escribir. Nun estudo cun alumno con autismo sen fala funcional, a saída de voz, soa ou combinada coa retroalimentación escrita, fixo máis eficiente a aprendizaxe da ortografía que a retroalimentación escrita soa (Schlosser et al., 1998). Na réplica con catro nenos, todos aprenderon as palabras, pero a retroalimentación máis eficiente non foi a mesma para todos: os autores relaciónana cun perfil máis visual, que aproveita máis a retroalimentación escrita, ou máis auditivo, que aproveita máis a oral (Schlosser e Blischak, 2004). Por iso a app non impón ningunha modalidade: o feedback de letra, de palabra e de frase pódese combinar ou desactivar de todo.',
        'Falar axuda, pero non é imprescindible para tomar conciencia dos sons da lingua. Nenos con parálise cerebral que non falaban mostraron conciencia fonolóxica de sílabas, de inicio e rima e de fonemas, e recoñeceron pseudopalabras escritas tan ben coma os que falaban; só lles custaron máis as tarefas que esixen reter a palabra e repetila mentalmente, como manipular os seus fonemas ou decidir se os nomes de dous debuxos riman, o que os autores atribúen á dificultade de usar o bucle articulatorio (Card e Dodd, 2006). Segundo un estudo que recollen os mesmos autores, nenos con parálise cerebral sen fala escribiron mellor as palabras cando oían o seu nome ca cando só vían o seu debuxo. En alumnos con discapacidade intelectual usuarios de CAA, o número de palabras que podían dicir coa fala relacionábase co coñecemento das correspondencias entre letras e sons e coa síntese de sons, mentres que o vocabulario do comunicador non tiña relación (Ulriksen et al., 2026a). E unha revisión da investigación conclúe que, para escribir palabras, as persoas que non se poden apoiar na fala poden beneficiarse de que o adulto volva dicir a palabra ou da saída de voz (Light et al., 2025). A voz de LECAA Docs cumpre esta función de voz externa: di a letra, a palabra ou a frase que a persoa non se pode dicir.',
        'A hipótese da autoaprendizaxe explica por que é útil oír a palabra rematada: cada vez que unha palabra escrita se converte en son, o aprendiz ten unha oportunidade de fixar a súa forma ortográfica e de conectala coa pronuncia e o significado (Share, 1995; Ehri, 2014). Ademais, practicar a escrita inventada, é dicir, escribir as palabras tal como soan, axudou a nenos de educación infantil a aprender a ler máis palabras ca outras formas de adestramento (Ouellette e Sénéchal, 2008), e a escrita inventada en educación infantil predí a lectura e a ortografía do curso seguinte (Ouellette e Sénéchal, 2017).',
        'A frase enteira, que a app le ao escribir o punto ou ao premer Intro, dá apoio á revisión (Hayes e Flower, 1980). Nun estudo con 33 estudantes universitarios con dificultades de aprendizaxe, escoitar o seu propio texto con síntese de voz permitiulles detectar unha porcentaxe de erros significativamente máis alta, aínda que a lectura en voz alta por parte doutra persoa seguiu a ser o máis eficaz (Raskind e Higgins, 1995).',
      ],
    },
    {
      title: 'O nome ou o son de cada letra',
      paras: [
        'O coñecemento do nome das letras é un dos mellores preditores da aprendizaxe da lectura (Foulin, 2005), e a instrución explícita do nome e do son das letras mellora este coñecemento (Piasta e Wagner, 2010). O nome da letra («be», «ce») é estable e é o que usan a escola e a familia para soletrear; o son é o que permite ler e escribir palabras novas. A app ofrece as dúas opcións, pero non á vez, para non duplicar a información nin alongar a espera entre tecla e tecla.',
        'Nas ortografías transparentes, como a castelá, a aprendizaxe inicial das correspondencias entre letras e sons é moito máis rápida ca nas opacas, como a inglesa (Seymour et al., 2003). Isto suxire que, en linguas con correspondencias regulares, o son de cada letra é unha pista especialmente útil para escribir. Os sons gravados con voz humana só existen en catalán e en castelán, porque as voces sintéticas non pronuncian ben os sons illados. Na fala os sons coarticúlanse, de maneira que pronunciar un fonema illado sempre o distorsiona un pouco, e consoantes como /p/, /t/ ou /l/ son especialmente difíciles de dicir soas (Garriga Ferriol, 2003a); por iso é importante que os pronuncie unha persoa.',
        'Ademais, a correspondencia entre letras e sons non sempre é de un a un. En catalán, por exemplo, un mesmo son pódese escribir con letras diferentes, como /s/ con s, ss, c ou ç, e unha mesma letra, como o g, pode representar sons diferentes (Garriga Ferriol, 2003a). O son da letra orienta, pero non resolve todas as decisións ortográficas; por iso convén combinalo co nome da letra e coa lectura da palabra enteira.',
        'As correspondencias entre letras e sons son a habilidade cunha evidencia máis consistente en nenos con discapacidade intelectual usuarios de CAA, e as intervencións que as combinan coa síntese e a segmentación de sons dan ganancias máis amplas (Ulriksen et al., 2026b). No programa de conciencia fonolóxica adaptado ao catalán por Garriga Ferriol (2003b), o traballo oral desemboca en actividades con letras e de soletreo, porque o adestramento é máis eficaz cando as correspondencias entre sons e grafías se traballan á vez. Escribir oíndo o son de cada letra, ou soletrear unha palabra cos sons, é unha maneira de aplicar estas correspondencias, que o adulto pode combinar co ensino da síntese e a segmentación de sons.',
      ],
    },
    {
      title: 'Ler en voz alta e soletrear',
      paras: [
        'A lectura a demanda resalta a frase e, cando o motor de voz o permite, a palabra que se oe, de maneira que o texto chega á vez pola vista e polo oído. Esta presentación bimodal mellorou a comprensión dos lectores menos hábiles respecto da presentación por unha soa canle (Montali e Lewandowski, 1996), e unha metaanálise sobre a síntese de voz e outras axudas de lectura en voz alta en alumnado con dificultades de lectura atopou un efecto positivo sobre a comprensión, de tamaño pequeno a moderado (0,35; Wood et al., 2018). Resaltar o texto ao mesmo tempo que se oe segue o principio de contigüidade temporal da aprendizaxe multimedia (Mayer, 2021).',
        'Cando se selecciona unha soa palabra, aparece a opción «Soletrear», que resalta cada letra en orde mentres di o seu son con voz gravada ou, se a configuración o pide, o seu nome, co aviso das maiúsculas; nos idiomas sen sons gravados di sempre o nome. Fai visible a estrutura ortográfica da palabra, combina retroalimentación escrita e oral, como nos estudos de Schlosser e Blischak (2004), e permite comprobar como se escribe unha palabra sen depender doutra persoa. Soletrear cos sons seméllase á función de decodificación dalgúns comunicadores deseñados para facilitar o paso á lectoescrita, que resalta cada letra mentres a voz di o seu son (Holyfield et al., 2026): en oito estudos con 32 nenos, adolescentes e adultos con discapacidades do desenvolvemento usuarios de CAA, mellorou a decodificación e o coñecemento das correspondencias entre letras e sons (Light et al., 2025). Soletrear cos nomes aproveita o coñecemento do nome das letras, un dos mellores predictores da aprendizaxe da lectura (Foulin, 2005).',
      ],
    },
    {
      title: 'As voces',
      paras: [
        'A intelixibilidade da voz sintética varía dun sintetizador a outro e é máis baixa para os nenos ca para os adultos (Mirenda e Beukelman, 1987; Drager et al., 2010). Por iso a app permite escoller entre as voces instaladas no dispositivo e voces neuronais gratuítas que funcionan sen conexión, e axustar a súa velocidade, ton e volume. Convén escoller a voz probándoa coa propia persoa.',
      ],
    },
    {
      title: 'Os pictogramas',
      paras: [
        'Os pictogramas poden axudar ou estorbar segundo o obxectivo. Para entender un texto, a evidencia é mixta: nun estudo, os símbolos melloraron a comprensión de textos de adultos con discapacidade intelectual (Jones et al., 2007), pero noutro non a melloraron respecto do texto só (Poncelas e Murphy, 2007); mesmo persoas adultas sen discapacidade interpretaron con pouco acerto pictogramas illados que representaban enunciados abstractos (Benson-Goldberg e Erickson, 2020).',
        'Para aprender a recoñecer a palabra escrita, en cambio, a imaxe pode captar a atención e retardar a aprendizaxe (Samuels, 1970). Nun estudo con seis alumnos, cinco aprenderon máis axiña as palabras presentadas sen imaxe (Didden et al., 2000); noutro, o alumnado tivo máis éxito cando relacionaba activamente imaxes e palabras escritas que cando as palabras se presentaban acompañadas da imaxe (Fossett e Mirenda, 2006). Os símbolos poden axudar a aprender palabras cando se combinan con estratexias de ensino específicas (Sheehy, 2002), pero, en xeral, Erickson et al. (2010) recomendan non emparellar imaxes coas palabras que o alumno debe aprender a ler ou a escribir.',
        'As revisións recentes engaden dous datos. Non hai evidencia de que coñecer os símbolos gráficos axude directamente a adquirir as habilidades da lectoescrita convencional, como a conciencia fonolóxica, as correspondencias entre letras e sons ou a codificación, porque, a diferenza das letras, os pictogramas non teñen ningunha relación cos sons da palabra (Light et al., 2025). E a etiqueta de texto fixa que moitos comunicadores poñen enriba do símbolo pode interferir na aprendizaxe da palabra escrita (Caron et al., 2021).',
        'LECAA Docs aplica estes datos de catro maneiras. O pictograma aparece cando a palabra xa se escribiu: a persoa escribe a partir das letras e o pictograma confírmalle o significado. Por defecto, non hai pictograma para artigos, preposicións, conxuncións e pronomes átonos, de maneira que a axuda visual se concentra nas palabras con contido. Pódense agochar cun só botón. E a configuración permite que se esvaezan ao cabo duns segundos ou que só se vexan ao tocar a palabra, para que a imaxe compita menos co texto e a axuda visual se poida ir retirando. A mesma idea, que a palabra escrita estea no centro, é a dos comunicadores que mostran o texto de maneira dinámica cando se selecciona un pictograma: combinada coa saída de voz, mellorou o recoñecemento de palabras escritas de cinco participantes con autismo (Caron et al., 2018) e de catro rapaces de 9 a 18 anos con autismo grave e moi pouca fala (Caron et al., 2021); en conxunto, en nove estudos con 37 participantes, o 89 % melloraron na lectura de palabras (Light et al., 2025). Caron et al. (2021) propoñen, ademais, ir retirando os pictogramas a medida que a persoa aprende as palabras, para facilitar o paso á escrita alfabética; a opción de esvaecer os pictogramas responde a esta proposta.',
        'Os documentos gardados e impresos levan todos os pictogramas para que outros lectores, como a familia, poidan aproveitalos, tendo presente que o efecto dos símbolos sobre a comprensión varía dunha persoa a outra (Jones et al., 2007; Poncelas e Murphy, 2007).',
      ],
    },
    {
      title: 'Os teclados e o acceso motor',
      paras: [
        'LECAA Docs non ten teclado propio: funciona co teclado físico e co teclado en pantalla de cada sistema. Así a persoa escribe co mesmo método de acceso que usa nas demais aplicacións e cos axustes de accesibilidade do sistema que xa ten configurados, de acordo co principio de axustar as ferramentas ás capacidades e necesidades de cada persoa que guía a intervención en CAA (Beukelman e Light, 2020). Isto é especialmente importante porque as dificultades motoras provocan erros de teclado característicos (Trewin e Pain, 1999).',
        'Escribir co método de acceso habitual tamén importa para valorar o que a persoa sabe. Nunha revisión das probas de coñecemento do escrito feitas con alumnado usuario de CAA, máis do 40 % pedían unha maneira de responder distinta da que o alumno usaba para comunicarse, e os autores recomendan que a persoa poida participar co seu sistema e o seu método de acceso habituais (Collins et al., 2024).',
      ],
    },
    {
      title: 'A protección do tecleo',
      paras: [
        'A opción de non aceptar teclas mentres soa o feedback fai que cada mensaxe de voz se oia enteira antes da tecla seguinte. Evita que a información se superpoña e, de acordo coa teoría da carga cognitiva e co principio de contigüidade temporal, facilita que cada son se relacione co que se acaba de escribir (Sweller, 1988; Mayer, 2021).',
      ],
    },
    {
      title: 'Os tipos de letra',
      paras: [
        'A app inclúe varias letras con formas claras para que cada persoa use a que lea mellor. As letras especiais para a dislexia non mostraron beneficios: OpenDyslexic non mellorou a velocidade nin a precisión lectora de alumnado con dislexia (Wery e Diliberto, 2017), e Dyslexie tampouco mellorou a lectura de nenos con ou sen dislexia (Kuster et al., 2018). OpenDyslexic inclúese porque algunhas persoas a prefiren, non porque mellore a lectura. En cambio, separar máis as letras si mellorou a lectura de nenos con dislexia (Zorzi et al., 2012). A letra ligada (Playwrite ES, modelo escolar) permite traballar na pantalla co mesmo modelo de letra da aula, por coherencia coa práctica escolar.',
      ],
    },
    {
      title: 'Os documentos e o seguimento',
      paras: [
        'Cada documento gárdase co día en que se comezou e o do último cambio, de maneira que se pode ver como evoluciona a escrita de cada persoa. Unha metaanálise atopou que a retroalimentación sobre a escrita mellora a calidade dos textos, tanto se a dan os adultos (efecto medio de 0,87) coma os compañeiros (0,58), a propia persoa (0,62) ou o ordenador (0,38), mentres que o seguimento do progreso por si só non a mellorou de maneira apreciable (Graham et al., 2015). Unha colección de textos datados é, polo tanto, útil sobre todo como base para dar retroalimentación. Ademais, como hai poucas probas estandarizadas de lectura e escrita adaptadas ás persoas que non falan (Collins et al., 2024; Ulriksen et al., 2026b), os textos que a persoa escribe co seu método de acceso habitual son unha fonte de información valiosa para valorar a súa evolución. Os documentos gárdanse só no dispositivo e non se envían a ningures.',
      ],
    },
    {
      title: 'Seis idiomas',
      paras: [
        'A app funciona en catalán, castelán, éuscaro, galego, inglés e francés, cada un cos seus nomes de letras, voces, pictogramas e configuración, de maneira que se pode escribir na lingua da escola e na da casa. Segundo a hipótese da interdependencia lingüística, as habilidades académicas e de lectoescritura desenvolvidas nunha lingua pódense transferir á outra (Cummins, 1979).',
      ],
    },
    {
      title: 'A app, o ensino e a familia',
      paras: [
        'LECAA Docs está pensado para practicar a escrita dentro dun ensino explícito e sistemático, que é o máis eficaz cos usuarios de CAA: o adulto modela a habilidade, guía a práctica, dá retroalimentación correctiva e ofrece moitas oportunidades de practicar (Ulriksen et al., 2026b; Babb e Caron, 2026). As aplicacións axudan como complemento. Nun estudo con 123 alumnos con discapacidade intelectual, os autores conclúen que as aplicacións dixitais poden apoiar o ensino da lectura se se usan coa guía do profesorado (Palmqvist et al., 2025), e as funcións de texto dinámico dos comunicadores están pensadas para complementar o ensino (Caron et al., 2021; Light et al., 2025).',
        'Combinar varias habilidades tamén dá bos resultados. No estudo sueco, o grupo que combinou un programa fonolóxico e un de comprensión mellorou máis en conciencia fonolóxica ca os demais (Palmqvist et al., 2025), e catro nenos usuarios de CAA melloraron á vez en síntese de sons, decodificación e lectura de palabras frecuentes cunha aplicación de alfabetización que as súas nais, formadas a distancia, usaban cinco días á semana na casa (Babb e Caron, 2026). Este último estudo mostra que a familia pode ter un papel activo se recibe formación e acompañamento; Garriga Ferriol (2003a) tamén destaca o papel da familia como facilitadora da aprendizaxe da lectura. Que LECAA Docs funcione igual na casa e na escola, nun navegador e sen instalación, facilita esta continuidade.',
      ],
    },
    {
      title: 'Cada opción pódese axustar',
      paras: [
        'O deseño universal para a aprendizaxe recomenda ofrecer diversas maneiras de percibir a información, de implicarse e de expresarse (CAST, 2024). Como a resposta a cada tipo de axuda varía dunha persoa a outra (Schlosser e Blischak, 2004), todas as opcións de LECAA Docs se poden configurar por separado, e cada idioma garda a súa propia configuración. Recoméndase escollelas a partir da observación sistemática de cada persoa e revisalas a medida que avanza. Tampouco hai un método único que sirva para todo o mundo: na alfabetización do alumnado xordo, por exemplo, Garriga Ferriol (2003a) conclúe que o camiño se debe escoller a partir da situación de cada alumno.',
      ],
    },
  ],
  references: 'Referencias',
};

export default text;
