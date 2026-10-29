import type { Framework } from './tipus';

// Traducción del texto catalán (ca.ts), párrafo por párrafo.
const text: Framework = {
  intro: [
    'LECAA Docs quiere ayudar a las personas que usan comunicación aumentativa y alternativa (CAA) a aprender a escribir y a escribir con más autonomía. Este texto explica, a partir de la investigación, por qué la app ofrece cada opción y por qué todas se pueden activar, combinar o desactivar según la persona.',
    'Conviene tener presente el alcance de la evidencia. La investigación sobre la alfabetización de las personas usuarias de CAA se basa sobre todo en estudios de caso único y en muestras pequeñas (Light y McNaughton, 2012), y buena parte de los datos sobre procesadores de textos con voz proceden de alumnado con dificultades de aprendizaje, no de usuarios de CAA (MacArthur, 2009). LECAA Docs todavía no se ha evaluado empíricamente. Cuando una opción se basa en evidencia indirecta o en la práctica profesional, el texto lo dice.',
  ],
  sections: [
    {
      title: 'La escritura es para todo el mundo',
      paras: [
        'Las personas con necesidades complejas de comunicación suelen tener menos oportunidades de aprender a leer y a escribir, pero con una instrucción adecuada y con acceso a herramientas de escritura pueden progresar (Light y McNaughton, 2012; Erickson y Koppenhaver, 2020). Escribir da acceso a una comunicación abierta: permite decir cualquier cosa, no solo el vocabulario que alguien ha previsto en un tablero o en un comunicador (Beukelman y Light, 2020). Para quien no puede escribir a mano, el teclado, físico o en pantalla, hace de «lápiz alternativo» y pone todas las letras a su alcance (Erickson y Koppenhaver, 2020).',
      ],
    },
    {
      title: 'Escribir es transcribir y componer',
      paras: [
        'Los modelos cognitivos de la escritura distinguen tres procesos: planificar qué se quiere decir, convertir las ideas en texto y revisarlo (Hayes y Flower, 1980). Mientras se aprende, la transcripción, es decir, encontrar las letras y escribir las palabras, ocupa una parte importante de la memoria de trabajo y deja menos recursos para pensar el mensaje (McCutchen, 1996; Graham y Harris, 2000). Las opciones de LECAA Docs quieren reducir esta carga: la voz confirma lo que se ha escrito, el pictograma confirma el significado de la palabra y la letra se adapta a la manera de leer de cada persona.',
      ],
    },
    {
      title: 'Oír lo que se escribe: la letra, la palabra y la frase',
      paras: [
        'Quien no puede hablar no puede decirse en voz alta lo que escribe para comprobarlo. La voz de la app cumple esta función: devuelve en sonido el texto escrito para que la persona lo compare con lo que quería escribir. En un estudio con un alumno con autismo sin habla funcional, la salida de voz, sola o combinada con la retroalimentación escrita, hizo más eficiente el aprendizaje de la ortografía que la retroalimentación escrita sola (Schlosser et al., 1998). En la réplica con cuatro niños, todos aprendieron las palabras, pero la retroalimentación más eficiente no fue la misma para todos: los autores la relacionan con un perfil más visual, que aprovecha más la retroalimentación escrita, o más auditivo, que aprovecha más la oral (Schlosser y Blischak, 2004). Por eso la app no impone ninguna modalidad: el feedback de letra, de palabra y de frase se puede combinar o desactivar del todo.',
        'La hipótesis del autoaprendizaje explica por qué es útil oír la palabra terminada: cada vez que una palabra escrita se convierte en sonido, el aprendiz tiene una oportunidad de fijar su forma ortográfica y de conectarla con la pronunciación y el significado (Share, 1995; Ehri, 2014). Además, practicar la escritura inventada, es decir, escribir las palabras tal como suenan, ayudó a niños de educación infantil a aprender a leer más palabras que otras formas de entrenamiento (Ouellette y Sénéchal, 2008), y la escritura inventada en educación infantil predice la lectura y la ortografía del curso siguiente (Ouellette y Sénéchal, 2017).',
        'La frase entera, que la app lee al escribir el punto o al pulsar Intro, da apoyo a la revisión (Hayes y Flower, 1980). En un estudio con 33 estudiantes universitarios con dificultades de aprendizaje, escuchar su propio texto con síntesis de voz les permitió detectar un porcentaje de errores significativamente más alto, aunque la lectura en voz alta por parte de otra persona siguió siendo lo más eficaz (Raskind y Higgins, 1995).',
      ],
    },
    {
      title: 'El nombre o el sonido de cada letra',
      paras: [
        'El conocimiento del nombre de las letras es uno de los mejores predictores del aprendizaje de la lectura (Foulin, 2005), y la instrucción explícita del nombre y del sonido de las letras mejora este conocimiento (Piasta y Wagner, 2010). El nombre de la letra («be», «ce cedilla») es estable y es el que usan la escuela y la familia para deletrear; el sonido es el que permite leer y escribir palabras nuevas. La app ofrece las dos opciones, pero no a la vez, para no duplicar la información ni alargar la espera entre tecla y tecla.',
        'En las ortografías transparentes, como la castellana, el aprendizaje inicial de las correspondencias entre letras y sonidos es mucho más rápido que en las opacas, como la inglesa (Seymour et al., 2003). Esto sugiere que, en lenguas con correspondencias regulares, el sonido de cada letra es una pista especialmente útil para escribir. Los sonidos se han grabado con voz humana porque las voces sintéticas no pronuncian bien los sonidos aislados; es una decisión técnica, no un resultado de investigación.',
      ],
    },
    {
      title: 'Leer en voz alta y deletrear',
      paras: [
        'La lectura a demanda resalta la frase y, cuando el motor de voz lo permite, la palabra que se oye, de manera que el texto llega a la vez por la vista y por el oído. Esta presentación bimodal mejoró la comprensión de los lectores menos hábiles respecto de la presentación por un solo canal (Montali y Lewandowski, 1996), y un metaanálisis sobre la síntesis de voz y otras ayudas de lectura en voz alta en alumnado con dificultades de lectura encontró un efecto positivo sobre la comprensión, de tamaño pequeño a moderado (0,35; Wood et al., 2018). Resaltar el texto al mismo tiempo que se oye sigue el principio de contigüidad temporal del aprendizaje multimedia (Mayer, 2021).',
        'Cuando se selecciona una sola palabra, aparece la opción «Deletrear», que dice el nombre de cada letra en orden, avisa de las mayúsculas y resalta cada letra mientras la dice. Hace visible la estructura ortográfica de la palabra, combina retroalimentación escrita y oral, como en los estudios de Schlosser y Blischak (2004), y permite comprobar cómo se escribe una palabra sin depender de otra persona. No conocemos estudios que evalúen específicamente esta función: es una aplicación de la evidencia sobre el conocimiento del nombre de las letras y sobre la retroalimentación oral.',
      ],
    },
    {
      title: 'Las voces',
      paras: [
        'La inteligibilidad de la voz sintética varía de un sintetizador a otro y es más baja para los niños que para los adultos; además, la investigación con niños es escasa (Mirenda y Beukelman, 1987; Drager et al., 2010). Por eso la app permite elegir entre las voces instaladas en el dispositivo y voces neuronales gratuitas que funcionan sin conexión, y ajustar su velocidad, tono y volumen. Conviene elegir la voz probándola con la propia persona.',
      ],
    },
    {
      title: 'Los pictogramas',
      paras: [
        'Los pictogramas pueden ayudar o estorbar según el objetivo. Para entender un texto, la evidencia es mixta: en un estudio, los símbolos mejoraron la comprensión de textos de adultos con discapacidad intelectual (Jones et al., 2007), pero en otro no la mejoraron respecto del texto solo (Poncelas y Murphy, 2007); incluso personas adultas sin discapacidad interpretaron con poco acierto pictogramas aislados que representaban enunciados abstractos (Benson-Goldberg y Erickson, 2020).',
        'Para aprender a reconocer la palabra escrita, en cambio, la imagen puede captar la atención y ralentizar el aprendizaje (Samuels, 1970). En un estudio con seis alumnos, cinco aprendieron más deprisa las palabras presentadas sin imagen (Didden et al., 2000); en otro, el alumnado tuvo más éxito cuando relacionaba activamente imágenes y palabras escritas que cuando las palabras se presentaban acompañadas de la imagen (Fossett y Mirenda, 2006). Los símbolos pueden ayudar a aprender palabras cuando se combinan con estrategias de enseñanza específicas (Sheehy, 2002), pero, en general, Erickson et al. (2010) recomiendan no emparejar imágenes con las palabras que el alumno debe aprender a leer o a escribir.',
        'LECAA Docs aplica estos datos de cuatro maneras. El pictograma aparece cuando la palabra ya se ha escrito: la persona escribe a partir de las letras y el pictograma le confirma el significado. Por defecto, no hay pictograma para artículos, preposiciones, conjunciones y pronombres átonos, de manera que la ayuda visual se concentra en las palabras con contenido. Se pueden ocultar con un solo botón. Y la configuración permite que se desvanezcan al cabo de unos segundos o que solo se vean al tocar la palabra, para que la imagen compita menos con el texto y la ayuda visual se pueda ir retirando. La misma idea, que la palabra escrita esté en el centro, es la de los comunicadores que muestran el texto de manera dinámica cuando se selecciona un pictograma: combinada con la salida de voz, mejoró el reconocimiento de palabras escritas de cinco participantes con autismo (Caron et al., 2018).',
        'No hemos encontrado estudios sobre pictogramas que aparecen encima de las palabras mientras se escribe, de manera que estas opciones se deben valorar con cada persona. Los documentos guardados e impresos llevan todos los pictogramas para que otros lectores, como la familia, puedan aprovecharlos, teniendo presente que el efecto de los símbolos sobre la comprensión varía de una persona a otra (Jones et al., 2007; Poncelas y Murphy, 2007).',
      ],
    },
    {
      title: 'Los teclados y el acceso motor',
      paras: [
        'LECAA Docs no tiene teclado propio: funciona con el teclado físico y con el teclado en pantalla de cada sistema. Así la persona escribe con el mismo método de acceso que usa en las demás aplicaciones y con los ajustes de accesibilidad del sistema que ya tiene configurados, de acuerdo con el principio de ajustar las herramientas a las capacidades y necesidades de cada persona que guía la intervención en CAA (Beukelman y Light, 2020). Las dificultades motrices provocan errores de teclado característicos (Trewin y Pain, 1999); el ajuste motor, que ignora la misma tecla repetida en menos de un tiempo configurable, quiere compensar las repeticiones involuntarias, como hacen los ajustes de accesibilidad de los sistemas operativos.',
      ],
    },
    {
      title: 'La protección del tecleo',
      paras: [
        'La opción de no aceptar teclas mientras suena el feedback hace que cada mensaje de voz se oiga entero antes de la tecla siguiente. Evita que la información se superponga y, de acuerdo con la teoría de la carga cognitiva y con el principio de contigüidad temporal, debería facilitar que cada sonido se relacione con lo que se acaba de escribir (Sweller, 1988; Mayer, 2021). Es una aplicación de estos principios generales, no una intervención evaluada.',
        'La detección de usos indebidos del teclado (varias teclas a la vez, ráfagas muy rápidas, la misma letra muchas veces) y el aviso de calma proceden de la experiencia profesional de la UTAC con alumnado que explora el teclado sin intención de escribir, y quieren hacer visible que escribir es elegir cada letra. No conocemos investigación que evalúe este tipo de aviso; por eso cada señal se puede desactivar, y el mensaje y la duración se pueden cambiar. La pantalla completa con contraseña y la configuración protegida evitan cambios accidentales en el aula; también son decisiones prácticas sin evidencia experimental específica.',
      ],
    },
    {
      title: 'Los tipos de letra',
      paras: [
        'La app incluye varias letras con formas claras para que cada persona use la que lea mejor. Las letras especiales para la dislexia no han mostrado beneficios: OpenDyslexic no mejoró la velocidad ni la precisión lectora de alumnado con dislexia (Wery y Diliberto, 2017), y Dyslexie tampoco mejoró la lectura de niños con o sin dislexia (Kuster et al., 2018). OpenDyslexic se incluye porque algunas personas la prefieren, no porque mejore la lectura. En cambio, separar más las letras sí mejoró la lectura de niños con dislexia (Zorzi et al., 2012). La letra ligada (Playwrite ES, modelo escolar) permite trabajar en la pantalla con el mismo modelo de letra del aula; es una decisión de coherencia con la práctica escolar, sin evidencia experimental específica.',
      ],
    },
    {
      title: 'Los documentos y el seguimiento',
      paras: [
        'Cada documento se guarda con el día en que se empezó y el del último cambio, de manera que se puede ver cómo evoluciona la escritura de cada persona. Un metaanálisis encontró que la retroalimentación sobre la escritura mejora la calidad de los textos, tanto si la dan los adultos (efecto medio de 0,87) como los compañeros (0,58), la propia persona (0,62) o el ordenador (0,38), mientras que el seguimiento del progreso por sí solo no la mejoró de manera apreciable (Graham et al., 2015). Una colección de textos fechados es, por tanto, útil sobre todo como base para dar retroalimentación. Los documentos se guardan solo en el dispositivo y no se envían a ningún sitio.',
      ],
    },
    {
      title: 'Seis idiomas',
      paras: [
        'La app funciona en catalán, castellano, euskera, gallego, inglés y francés, cada uno con sus nombres de letras, voces, pictogramas y configuración, de manera que se puede escribir en la lengua de la escuela y en la de casa. Según la hipótesis de la interdependencia lingüística, las habilidades académicas y de lectoescritura desarrolladas en una lengua se pueden transferir a la otra (Cummins, 1979).',
      ],
    },
    {
      title: 'Cada opción se puede ajustar',
      paras: [
        'El diseño universal para el aprendizaje recomienda ofrecer diversas maneras de percibir la información, de implicarse y de expresarse (CAST, 2024). Como la respuesta a cada tipo de ayuda varía de una persona a otra (Schlosser y Blischak, 2004), todas las opciones de LECAA Docs se pueden configurar por separado, y cada idioma guarda su propia configuración. Se recomienda elegirlas a partir de la observación sistemática de cada persona y revisarlas a medida que avanza.',
      ],
    },
    {
      title: 'Límites de este marco',
      paras: [
        'La mayoría de los estudios citados son de caso único o con muestras pequeñas, y muchos no se han hecho con usuarios de CAA sino con alumnado con dificultades de aprendizaje o con discapacidad intelectual; los resultados se deben extrapolar con prudencia. LECAA Docs todavía no se ha evaluado en un estudio propio. Los profesionales que lo usan pueden contribuir a ello recogiendo de manera sistemática datos de la evolución de cada persona.',
      ],
    },
  ],
  references: 'Referencias',
};

export default text;
