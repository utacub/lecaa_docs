import type { Framework } from './tipus';

// Traduction du texte catalan (ca.ts), paragraphe par paragraphe.
const text: Framework = {
  intro: [
    'LECAA Docs veut aider les personnes qui utilisent la communication alternative et améliorée (CAA) à apprendre à écrire et à écrire avec plus d’autonomie. Ce texte explique, à partir de la recherche, pourquoi l’app propose chaque option et pourquoi toutes peuvent être activées, combinées ou désactivées selon la personne.',
    'Il convient de garder à l’esprit la portée des données. La recherche sur l’alphabétisation des personnes qui utilisent la CAA repose surtout sur des études de cas unique et sur de petits échantillons (Light et McNaughton, 2012), et une bonne partie des données sur les traitements de texte avec voix provient d’élèves ayant des troubles des apprentissages, et non d’utilisateurs de CAA (MacArthur, 2009). LECAA Docs lui-même n’a pas encore été évalué empiriquement. Lorsqu’une option repose sur des données indirectes ou sur la pratique professionnelle, le texte le précise.',
  ],
  sections: [
    {
      title: 'L’écriture est pour tout le monde',
      paras: [
        'Les personnes ayant des besoins complexes de communication ont souvent moins d’occasions d’apprendre à lire et à écrire, mais avec un enseignement adapté et un accès à des outils d’écriture, elles peuvent progresser (Light et McNaughton, 2012 ; Erickson et Koppenhaver, 2020). Écrire donne accès à une communication ouverte : cela permet de tout dire, et pas seulement le vocabulaire que quelqu’un a prévu sur un tableau ou dans un appareil de communication (Beukelman et Light, 2020). Pour qui ne peut pas écrire à la main, le clavier, physique ou à l’écran, sert de « crayon alternatif » et met toutes les lettres à sa portée (Erickson et Koppenhaver, 2020).',
      ],
    },
    {
      title: 'Écrire, c’est transcrire et composer',
      paras: [
        'Les modèles cognitifs de l’écriture distinguent trois processus : planifier ce que l’on veut dire, transformer les idées en texte et le réviser (Hayes et Flower, 1980). Pendant l’apprentissage, la transcription, c’est-à-dire trouver les lettres et écrire les mots, occupe une grande partie de la mémoire de travail et laisse moins de ressources pour penser au message (McCutchen, 1996 ; Graham et Harris, 2000). Les options de LECAA Docs visent à réduire cette charge : la voix confirme ce qui a été écrit, le pictogramme confirme le sens du mot et la police s’adapte à la manière de lire de chaque personne.',
      ],
    },
    {
      title: 'Entendre ce que l’on écrit : la lettre, le mot et la phrase',
      paras: [
        'Qui ne peut pas parler ne peut pas se dire à voix haute ce qu’il écrit pour le vérifier. La voix de l’app remplit cette fonction : elle restitue en son le texte écrit pour que la personne le compare avec ce qu’elle voulait écrire. Dans une étude avec un élève autiste sans langage oral fonctionnel, la sortie vocale, seule ou combinée à la rétroaction écrite, a rendu l’apprentissage de l’orthographe plus efficace que la rétroaction écrite seule (Schlosser et al., 1998). Dans la réplication avec quatre enfants, tous ont appris les mots, mais la rétroaction la plus efficace n’était pas la même pour tous : les auteurs la relient à un profil plutôt visuel, qui tire davantage parti de la rétroaction écrite, ou plutôt auditif, qui tire davantage parti de la rétroaction orale (Schlosser et Blischak, 2004). C’est pourquoi l’app n’impose aucune modalité : les retours de lettre, de mot et de phrase peuvent être combinés ou entièrement désactivés.',
        'L’hypothèse de l’auto-apprentissage explique pourquoi il est utile d’entendre le mot terminé : chaque fois qu’un mot écrit est converti en son, l’apprenant a l’occasion d’en mémoriser l’orthographe et de la relier à la prononciation et au sens (Share, 1995 ; Ehri, 2014). De plus, pratiquer l’orthographe inventée, c’est-à-dire écrire les mots comme on les entend, a aidé des enfants de maternelle à apprendre à lire plus de mots que d’autres formes d’entraînement (Ouellette et Sénéchal, 2008), et l’orthographe inventée en maternelle prédit la lecture et l’orthographe de l’année suivante (Ouellette et Sénéchal, 2017).',
        'La phrase entière, que l’app lit quand on tape le point ou qu’on appuie sur Entrée, soutient la révision (Hayes et Flower, 1980). Dans une étude avec 33 étudiants universitaires ayant des troubles des apprentissages, écouter leur propre texte en synthèse vocale leur a permis d’y repérer un pourcentage d’erreurs significativement plus élevé, même si la lecture à voix haute par une autre personne restait la méthode la plus efficace (Raskind et Higgins, 1995).',
      ],
    },
    {
      title: 'Le nom ou le son de chaque lettre',
      paras: [
        'La connaissance du nom des lettres est l’un des meilleurs prédicteurs de l’apprentissage de la lecture (Foulin, 2005), et l’enseignement explicite du nom et du son des lettres améliore cette connaissance (Piasta et Wagner, 2010). Le nom de la lettre (« bé », « cé ») est stable et c’est celui qu’utilisent l’école et la famille pour épeler ; le son est ce qui permet de lire et d’écrire des mots nouveaux. L’app propose les deux options, mais pas en même temps, pour ne pas doubler l’information ni allonger l’attente entre deux touches.',
        'Dans les orthographes transparentes, comme l’espagnol, l’apprentissage initial des correspondances entre lettres et sons est beaucoup plus rapide que dans les orthographes opaques, comme l’anglais (Seymour et al., 2003). Cela suggère que, dans les langues aux correspondances régulières, le son de chaque lettre est un indice particulièrement utile pour écrire. Les sons des lettres enregistrés n’existent qu’en catalan et en espagnol ; ils ont été enregistrés avec une voix humaine parce que les voix de synthèse prononcent mal les sons isolés. C’est une décision technique, et non un résultat de recherche.',
      ],
    },
    {
      title: 'Lire à voix haute et épeler',
      paras: [
        'La lecture à la demande met en évidence la phrase et, quand le moteur vocal le permet, le mot que l’on entend, de sorte que le texte arrive en même temps par la vue et par l’ouïe. Cette présentation bimodale a amélioré la compréhension des lecteurs moins habiles par rapport à une présentation par un seul canal (Montali et Lewandowski, 1996), et une méta-analyse sur la synthèse vocale et les autres aides à la lecture à voix haute chez des élèves ayant des troubles de la lecture a trouvé un effet positif sur la compréhension, de taille faible à modérée (0,35 ; Wood et al., 2018). Mettre le texte en évidence au moment où on l’entend suit le principe de contiguïté temporelle de l’apprentissage multimédia (Mayer, 2021).',
        'Lorsqu’on sélectionne un seul mot, l’option « Épeler » apparaît : elle dit le nom de chaque lettre dans l’ordre, signale les majuscules et met chaque lettre en évidence pendant qu’elle la dit. Elle rend visible la structure orthographique du mot, associe rétroaction écrite et orale, comme dans les études de Schlosser et Blischak (2004), et permet de vérifier comment s’écrit un mot sans dépendre d’une autre personne. Nous ne connaissons pas d’études qui évaluent précisément cette fonction : elle applique les données sur la connaissance du nom des lettres et sur la rétroaction orale.',
      ],
    },
    {
      title: 'Les voix',
      paras: [
        'L’intelligibilité de la voix de synthèse varie d’un synthétiseur à l’autre et elle est plus faible chez les enfants que chez les adultes ; de plus, la recherche auprès des enfants est rare (Mirenda et Beukelman, 1987 ; Drager et al., 2010). C’est pourquoi l’app permet de choisir entre les voix installées sur l’appareil et des voix neuronales gratuites qui fonctionnent hors connexion, et d’en régler la vitesse, la hauteur et le volume. Il convient de choisir la voix en l’essayant avec la personne elle-même.',
      ],
    },
    {
      title: 'Les pictogrammes',
      paras: [
        'Les pictogrammes peuvent aider ou gêner selon l’objectif. Pour comprendre un texte, les données sont partagées : dans une étude, les symboles ont amélioré la compréhension de textes chez des adultes ayant une déficience intellectuelle (Jones et al., 2007), mais dans une autre, ils ne l’ont pas améliorée par rapport au texte seul (Poncelas et Murphy, 2007) ; même des adultes sans handicap ont interprété avec peu de réussite des pictogrammes isolés représentant des énoncés abstraits (Benson-Goldberg et Erickson, 2020).',
        'Pour apprendre à reconnaître le mot écrit, en revanche, l’image peut capter l’attention et ralentir l’apprentissage (Samuels, 1970). Dans une étude avec six élèves, cinq ont appris plus vite les mots présentés sans image (Didden et al., 2000) ; dans une autre, les élèves réussissaient mieux quand ils associaient activement des images à des mots écrits que lorsque les mots étaient présentés accompagnés de l’image (Fossett et Mirenda, 2006). Les symboles peuvent aider à apprendre des mots lorsqu’ils sont combinés à des stratégies d’enseignement spécifiques (Sheehy, 2002), mais, en général, Erickson et al. (2010) recommandent de ne pas associer d’images aux mots que l’élève doit apprendre à lire ou à écrire.',
        'LECAA Docs applique ces données de quatre manières. Le pictogramme apparaît quand le mot est déjà écrit : la personne écrit à partir des lettres et le pictogramme lui confirme le sens. Par défaut, il n’y en a pas pour les articles, prépositions, conjonctions et pronoms faibles, de sorte que l’aide visuelle se concentre sur les mots porteurs de sens. On peut les masquer d’un seul bouton. Et les réglages permettent qu’ils s’estompent au bout de quelques secondes ou qu’ils ne s’affichent qu’en touchant le mot, pour que l’image fasse moins concurrence au texte et que l’aide visuelle puisse être retirée peu à peu. La même idée, garder le mot écrit au centre, est celle des applications de communication qui affichent le texte de façon dynamique quand on sélectionne un pictogramme : combinée à la sortie vocale, elle a amélioré la reconnaissance de mots écrits chez cinq participants autistes (Caron et al., 2018).',
        'Nous n’avons pas trouvé d’études sur des pictogrammes qui apparaissent au-dessus des mots pendant l’écriture ; ces options doivent donc être évaluées avec chaque personne. Les documents enregistrés et imprimés contiennent tous les pictogrammes pour que d’autres lecteurs, comme la famille, puissent en profiter, en gardant à l’esprit que l’effet des symboles sur la compréhension varie d’une personne à l’autre (Jones et al., 2007 ; Poncelas et Murphy, 2007).',
      ],
    },
    {
      title: 'Les claviers et l’accès moteur',
      paras: [
        'LECAA Docs n’a pas de clavier propre : il fonctionne avec le clavier physique et avec le clavier à l’écran de chaque système. La personne écrit ainsi avec la même méthode d’accès que dans les autres applications et avec les réglages d’accessibilité du système qu’elle a déjà configurés, conformément au principe d’adapter les outils aux capacités et aux besoins de chaque personne qui guide l’intervention en CAA (Beukelman et Light, 2020). Les difficultés motrices entraînent des erreurs de clavier caractéristiques (Trewin et Pain, 1999) ; le réglage moteur, qui ignore la même touche répétée en moins d’un temps réglable, vise à compenser les répétitions involontaires, comme le font les réglages d’accessibilité des systèmes d’exploitation.',
      ],
    },
    {
      title: 'La protection de la frappe',
      paras: [
        'L’option de ne pas accepter de touches pendant le retour vocal fait que chaque message est entendu en entier avant la touche suivante. Elle évite que les informations se superposent et, selon la théorie de la charge cognitive et le principe de contiguïté temporelle, devrait faciliter le lien entre chaque son et ce qui vient d’être écrit (Sweller, 1988 ; Mayer, 2021). C’est une application de ces principes généraux, et non une intervention évaluée.',
        'La détection des mauvais usages du clavier (plusieurs touches à la fois, rafales très rapides, la même lettre de nombreuses fois) et le message de calme proviennent de l’expérience professionnelle de l’UTAC auprès d’élèves qui explorent le clavier sans intention d’écrire, et visent à rendre visible qu’écrire, c’est choisir chaque lettre. Nous ne connaissons pas de recherche qui évalue ce type de message ; c’est pourquoi chaque signal peut être désactivé, et le message et la durée peuvent être modifiés. Le plein écran avec mot de passe et les réglages protégés évitent les changements accidentels en classe ; ce sont aussi des décisions pratiques sans données expérimentales spécifiques.',
      ],
    },
    {
      title: 'Les polices',
      paras: [
        'L’app propose plusieurs polices aux formes claires pour que chaque personne utilise celle qu’elle lit le mieux. Les polices spéciales pour la dyslexie n’ont pas montré de bénéfices : OpenDyslexic n’a amélioré ni la vitesse ni la précision de lecture d’élèves dyslexiques (Wery et Diliberto, 2017), et Dyslexie n’a pas amélioré la lecture d’enfants avec ou sans dyslexie (Kuster et al., 2018). OpenDyslexic est proposée parce que certaines personnes la préfèrent, et non parce qu’elle améliore la lecture. En revanche, espacer davantage les lettres a amélioré la lecture d’enfants dyslexiques (Zorzi et al., 2012). L’écriture cursive (Playwrite ES, modèle scolaire) permet de travailler à l’écran avec le même modèle d’écriture qu’en classe ; c’est une décision de cohérence avec la pratique scolaire, sans données expérimentales spécifiques.',
      ],
    },
    {
      title: 'Les documents et le suivi',
      paras: [
        'Chaque document est enregistré avec le jour où il a été commencé et celui de sa dernière modification, de sorte que l’on peut voir l’évolution de l’écriture de chaque personne. Une méta-analyse a montré que la rétroaction sur l’écriture améliore la qualité des textes, qu’elle vienne des adultes (effet moyen de 0,87), des pairs (0,58), de la personne elle-même (0,62) ou de l’ordinateur (0,38), alors que le suivi des progrès à lui seul ne l’a pas améliorée de façon notable (Graham et al., 2015). Un recueil de textes datés est donc surtout utile comme base pour donner une rétroaction. Les documents sont enregistrés uniquement sur l’appareil et ne sont envoyés nulle part.',
      ],
    },
    {
      title: 'Six langues',
      paras: [
        'L’app fonctionne en catalan, espagnol, basque, galicien, anglais et français, chacune avec ses noms de lettres, ses voix, ses pictogrammes et ses réglages, de sorte que l’on peut écrire dans la langue de l’école et dans celle de la maison. Selon l’hypothèse de l’interdépendance linguistique, les compétences scolaires et de littératie acquises dans une langue peuvent se transférer à l’autre (Cummins, 1979).',
      ],
    },
    {
      title: 'Chaque option peut être réglée',
      paras: [
        'La conception universelle de l’apprentissage recommande d’offrir plusieurs moyens de percevoir l’information, de s’engager et de s’exprimer (CAST, 2024). Comme la réponse à chaque type d’aide varie d’une personne à l’autre (Schlosser et Blischak, 2004), toutes les options de LECAA Docs se règlent séparément, et chaque langue garde ses propres réglages. Il est recommandé de les choisir à partir de l’observation systématique de chaque personne et de les revoir au fil de ses progrès.',
      ],
    },
    {
      title: 'Limites de ce cadre',
      paras: [
        'La plupart des études citées sont des études de cas unique ou portent sur de petits échantillons, et beaucoup n’ont pas été menées auprès d’utilisateurs de CAA mais d’élèves ayant des troubles des apprentissages ou une déficience intellectuelle ; leurs résultats doivent être généralisés avec prudence. LECAA Docs n’a pas encore été évalué dans une étude propre. Les professionnels qui l’utilisent peuvent y contribuer en recueillant de manière systématique des données sur l’évolution de chaque personne.',
      ],
    },
  ],
  references: 'Références',
};

export default text;
