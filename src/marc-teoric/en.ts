import type { Framework } from './tipus';

// Translation of the Catalan text (ca.ts), paragraph by paragraph.
const text: Framework = {
  intro: [
    'LECAA Docs aims to help people who use augmentative and alternative communication (AAC) to learn to write and to write more independently. This text explains, on the basis of research, why the app offers each option and why every option can be turned on, combined or turned off for each person.',
    'The reach of the evidence should be kept in mind. Research on literacy for people who use AAC rests mainly on single-case studies and small samples (Light & McNaughton, 2012), and much of the data on talking word processors comes from students with learning disabilities, not from AAC users (MacArthur, 2009). LECAA Docs itself has not yet been evaluated empirically. When an option rests on indirect evidence or on professional practice, the text says so.',
  ],
  sections: [
    {
      title: 'Writing is for everyone',
      paras: [
        'People with complex communication needs usually have fewer opportunities to learn to read and write, but with suitable instruction and access to writing tools they can make progress (Light & McNaughton, 2012; Erickson & Koppenhaver, 2020). Writing opens up communication: it lets a person say anything, not only the vocabulary someone has foreseen on a board or a communication device (Beukelman & Light, 2020). For someone who cannot write by hand, a keyboard, physical or on screen, works as an “alternative pencil” and puts every letter within reach (Erickson & Koppenhaver, 2020).',
      ],
    },
    {
      title: 'Writing is transcribing and composing',
      paras: [
        'Cognitive models of writing distinguish three processes: planning what to say, turning ideas into text, and reviewing it (Hayes & Flower, 1980). While writing is being learnt, transcription, that is, finding the letters and spelling the words, takes up a large part of working memory and leaves fewer resources for thinking about the message (McCutchen, 1996; Graham & Harris, 2000). The options of LECAA Docs aim to reduce this load: the voice confirms what has been written, the pictogram confirms the meaning of the word, and the typeface is adapted to the way each person reads.',
      ],
    },
    {
      title: 'Hearing what is written: the letter, the word and the sentence',
      paras: [
        'Someone who cannot speak cannot say aloud what they write in order to check it. The app’s voice does this: it turns the written text back into sound so that the person can compare it with what they meant to write. In a study with a student with autism and no functional speech, speech output, alone or combined with written feedback, made spelling instruction more efficient than written feedback alone (Schlosser et al., 1998). In the replication with four children, all of them learnt the words, but the most efficient feedback was not the same for all: the authors relate it to a more visual profile, which benefits more from written feedback, or a more auditory one, which benefits more from spoken feedback (Schlosser & Blischak, 2004). This is why the app does not impose any mode: letter, word and sentence feedback can be combined or turned off altogether.',
        'The self-teaching hypothesis explains why hearing the finished word is useful: each time a written word is turned into sound, the learner has a chance to store its spelling and to connect it with its pronunciation and meaning (Share, 1995; Ehri, 2014). In addition, practising invented spelling, that is, writing words as they sound, helped kindergarten children learn to read more words than other kinds of training (Ouellette & Sénéchal, 2008), and invented spelling in kindergarten predicts reading and spelling in the following year (Ouellette & Sénéchal, 2017).',
        'The whole sentence, which the app reads when a full stop is typed or Enter is pressed, supports reviewing (Hayes & Flower, 1980). In a study with 33 university students with learning disabilities, listening to their own text with speech synthesis allowed them to find a significantly higher percentage of errors, although having another person read the text aloud remained the most effective method (Raskind & Higgins, 1995).',
      ],
    },
    {
      title: 'The name or the sound of each letter',
      paras: [
        'Letter-name knowledge is one of the best predictors of learning to read (Foulin, 2005), and explicit instruction in letter names and sounds improves this knowledge (Piasta & Wagner, 2010). The name of a letter (“bee”, “cee”) is stable, and it is what school and family use to spell words out; the sound is what makes it possible to read and write new words. The app offers both options, but not at the same time, so as not to duplicate information or lengthen the wait between keys.',
        'In transparent orthographies, such as Spanish, the first correspondences between letters and sounds are learnt much faster than in opaque ones, such as English (Seymour et al., 2003). This suggests that, in languages with regular correspondences, the sound of each letter is a particularly useful clue for writing. Recorded letter sounds are only available in Catalan and Spanish; they were recorded with a human voice because synthetic voices do not pronounce isolated sounds well. This is a technical decision, not a research finding.',
      ],
    },
    {
      title: 'Reading aloud and spelling out',
      paras: [
        'Reading on demand highlights the sentence and, when the speech engine allows it, the word being heard, so that the text arrives through sight and hearing at the same time. This bimodal presentation improved the comprehension of less skilled readers compared with presentation through a single channel (Montali & Lewandowski, 1996), and a meta-analysis of text-to-speech and other read-aloud tools for students with reading disabilities found a small-to-moderate positive effect on comprehension (0.35; Wood et al., 2018). Highlighting the text while it is heard follows the temporal contiguity principle of multimedia learning (Mayer, 2021).',
        'When a single word is selected, the option “Spell” appears: it says the name of each letter in order, mentions capital letters and highlights each letter as it is said. It makes the spelling structure of the word visible, combines written and spoken feedback, as in the studies by Schlosser and Blischak (2004), and lets a person check how a word is written without depending on someone else. We know of no studies that evaluate this specific function: it applies the evidence on letter-name knowledge and on spoken feedback.',
      ],
    },
    {
      title: 'The voices',
      paras: [
        'The intelligibility of synthetic speech varies from one synthesizer to another and is lower for children than for adults; research with children is also scarce (Mirenda & Beukelman, 1987; Drager et al., 2010). This is why the app lets users choose between the voices installed on the device and free neural voices that work offline, and adjust their rate, pitch and volume. The voice should be chosen by trying it with the person concerned.',
      ],
    },
    {
      title: 'The pictograms',
      paras: [
        'Pictograms can help or hinder, depending on the goal. For understanding a text, the evidence is mixed: in one study, symbols improved the text comprehension of adults with intellectual disabilities (Jones et al., 2007), but in another they did not improve it compared with text alone (Poncelas & Murphy, 2007); even adults without disabilities interpreted isolated pictograms representing abstract statements with little success (Benson-Goldberg & Erickson, 2020).',
        'For learning to recognise the written word, on the other hand, the picture can draw attention away and slow learning down (Samuels, 1970). In a study with six students, five learnt the words presented without a picture faster (Didden et al., 2000); in another, students were more successful when they actively matched pictures to printed words than when the words were presented together with the picture (Fossett & Mirenda, 2006). Symbols can help in learning words when they are combined with specific teaching strategies (Sheehy, 2002) but, in general, Erickson et al. (2010) advise against pairing pictures with the words that students are expected to learn to read or spell.',
        'LECAA Docs applies these findings in four ways. The pictogram appears once the word has been written: the person writes from the letters, and the pictogram confirms the meaning. By default there are none for articles, prepositions, conjunctions and weak pronouns, so that visual support is concentrated on content words. They can be hidden with a single button. And the settings allow them to fade after a few seconds or to show only when the word is touched, so that the picture competes less with the text and visual support can be withdrawn gradually. The same idea, keeping the written word at the centre, underlies communication apps that show the text dynamically when a pictogram is selected: combined with speech output, this improved the written word recognition of five participants with autism (Caron et al., 2018).',
        'We have found no studies on pictograms that appear above the words while writing, so these options should be assessed with each person. Saved and printed documents include all the pictograms so that other readers, such as the family, can benefit from them, bearing in mind that the effect of symbols on comprehension varies from person to person (Jones et al., 2007; Poncelas & Murphy, 2007).',
      ],
    },
    {
      title: 'Keyboards and motor access',
      paras: [
        'LECAA Docs has no keyboard of its own: it works with physical keyboards and with each system’s on-screen keyboard. The person thus writes with the same access method used in other apps, and with the system accessibility settings already in place, in line with the principle of matching tools to each person’s abilities and needs that guides AAC intervention (Beukelman & Light, 2020). Motor difficulties cause characteristic keyboard errors (Trewin & Pain, 1999); the motor adjustment, which ignores the same key repeated within a configurable time, aims to offset involuntary repetitions, as operating system accessibility settings do.',
      ],
    },
    {
      title: 'Typing protection',
      paras: [
        'The option not to accept keys while feedback is playing makes each spoken message be heard in full before the next key. It prevents information from overlapping and, according to cognitive load theory and the temporal contiguity principle, should make it easier to relate each sound to what has just been written (Sweller, 1988; Mayer, 2021). It is an application of these general principles, not an evaluated intervention.',
        'The detection of keyboard misuse (several keys at once, very fast bursts, the same letter many times) and the calming notice come from UTAC’s professional experience with students who explore the keyboard without intending to write, and aim to make it visible that writing means choosing each letter. We know of no research evaluating this kind of notice; this is why each signal can be turned off, and the message and duration can be changed. Password-protected full screen and protected settings prevent accidental changes in the classroom; these are also practical decisions without specific experimental evidence.',
      ],
    },
    {
      title: 'Typefaces',
      paras: [
        'The app includes several typefaces with clear letter shapes so that each person can use the one they read best. Special typefaces for dyslexia have not shown benefits: OpenDyslexic did not improve the reading rate or accuracy of students with dyslexia (Wery & Diliberto, 2017), and Dyslexie did not improve the reading of children with or without dyslexia (Kuster et al., 2018). OpenDyslexic is included because some people prefer it, not because it improves reading. Wider spacing between letters, by contrast, did improve the reading of children with dyslexia (Zorzi et al., 2012). The joined script (Playwrite ES, a school model) allows work on screen with the same letter model as in the classroom; this is a decision for consistency with school practice, without specific experimental evidence.',
      ],
    },
    {
      title: 'Documents and monitoring',
      paras: [
        'Each document is saved with the day it was started and the day of its last change, so that the development of each person’s writing can be seen. A meta-analysis found that feedback on writing improves text quality whether it comes from adults (mean effect 0.87), peers (0.58), the writers themselves (0.62) or computers (0.38), whereas monitoring progress on its own did not improve it meaningfully (Graham et al., 2015). A collection of dated texts is therefore useful above all as a basis for feedback. Documents are saved only on the device and are not sent anywhere.',
      ],
    },
    {
      title: 'Six languages',
      paras: [
        'The app works in Catalan, Spanish, Basque, Galician, English and French, each with its own letter names, voices, pictograms and settings, so that people can write in the language of school and in the language of home. According to the linguistic interdependence hypothesis, academic and literacy skills developed in one language can transfer to the other (Cummins, 1979).',
      ],
    },
    {
      title: 'Every option can be adjusted',
      paras: [
        'Universal Design for Learning recommends offering multiple means of perceiving information, of engagement and of expression (CAST, 2024). Since the response to each kind of support varies from person to person (Schlosser & Blischak, 2004), every option in LECAA Docs can be set separately, and each language keeps its own settings. It is recommended to choose them on the basis of systematic observation of each person and to review them as the person progresses.',
      ],
    },
    {
      title: 'Limits of this framework',
      paras: [
        'Most of the studies cited are single-case studies or have small samples, and many were not carried out with AAC users but with students with learning disabilities or intellectual disabilities; their results should be generalised with caution. LECAA Docs has not yet been evaluated in a study of its own. Professionals who use it can contribute by systematically collecting data on each person’s progress.',
      ],
    },
  ],
  references: 'References',
};

export default text;
