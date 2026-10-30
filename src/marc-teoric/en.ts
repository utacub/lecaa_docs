import type { Framework } from './tipus';

// Translation of the Catalan text (ca.ts), paragraph by paragraph.
const text: Framework = {
  intro: [
    'LECAA Docs aims to help people who use augmentative and alternative communication (AAC) to learn to write and to write more independently. This text explains, on the basis of research, why the app offers each option and why every option can be turned on, combined or turned off for each person.',
    'The options are based on research on literacy for people who use AAC (Light & McNaughton, 2012; Light et al., 2025), on research on talking word processors (MacArthur, 2009) and on research on learning to read and write. The following sections explain the evidence on which each decision rests.',
  ],
  sections: [
    {
      title: 'Writing is for everyone',
      paras: [
        'People with complex communication needs usually have fewer opportunities to learn to read and write, but with suitable instruction and access to writing tools they can make progress (Light & McNaughton, 2012; Erickson & Koppenhaver, 2020). Writing opens up communication: it lets a person say anything, not only the vocabulary someone has foreseen on a board or a communication device (Beukelman & Light, 2020). For someone who cannot write by hand, a keyboard, physical or on screen, works as an “alternative pencil” and puts every letter within reach (Erickson & Koppenhaver, 2020).',
        'The difficulties cannot be explained by disability alone. Low expectations, a lack of professional training and materials that require spoken responses, such as saying the sound of a letter or reading aloud, often leave these people without literacy instruction (Light et al., 2025). According to the data reported by Collins et al. (2024), around 90% of people with limited speech reach adulthood without enough functional literacy to read and write independently.',
        'Yet when they receive adapted instruction that does not require speech, children and adults with autism, cerebral palsy, Down syndrome or intellectual disability who use AAC learn correspondences between letters and sounds, phonological awareness and decoding (Light et al., 2025). A systematic review of single-case studies with children with intellectual disability who use AAC found consistent positive effects on correspondences between letters and sounds (Ulriksen et al., 2026b). In a study of 123 Swedish students with mild, moderate or severe intellectual disability who needed AAC, students at every level improved at a similar rate in phonological awareness and word reading (Palmqvist et al., 2025).',
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
        'Speaking helps, but it is not essential for becoming aware of the sounds of language. Children with cerebral palsy who did not speak showed phonological awareness of syllables, of onset and rime and of phonemes, and recognised written nonwords as well as those who spoke; they found harder only the tasks that require holding the word in mind and repeating it silently, such as manipulating its phonemes or deciding whether the names of two pictures rhyme, which the authors attribute to difficulty in using the articulatory loop (Card & Dodd, 2006). According to a study reported by the same authors, children with cerebral palsy without speech spelled words better when they heard their names than when they only saw a picture. In students with intellectual disability who use AAC, the number of words they could say with speech was related to their knowledge of the correspondences between letters and sounds and to sound blending, whereas the vocabulary on their communication device was not (Ulriksen et al., 2026a). And a review of the research concludes that, to spell words, people who cannot rely on speech may benefit from the adult saying the word again or from speech output (Light et al., 2025). The voice of LECAA Docs plays this role as an external voice: it says the letter, word or sentence that the person cannot say aloud.',
        'The self-teaching hypothesis explains why hearing the finished word is useful: each time a written word is turned into sound, the learner has a chance to store its spelling and to connect it with its pronunciation and meaning (Share, 1995; Ehri, 2014). In addition, practising invented spelling, that is, writing words as they sound, helped kindergarten children learn to read more words than other kinds of training (Ouellette & Sénéchal, 2008), and invented spelling in kindergarten predicts reading and spelling in the following year (Ouellette & Sénéchal, 2017).',
        'The whole sentence, which the app reads when a full stop is typed or Enter is pressed, supports reviewing (Hayes & Flower, 1980). In a study with 33 university students with learning disabilities, listening to their own text with speech synthesis allowed them to find a significantly higher percentage of errors, although having another person read the text aloud remained the most effective method (Raskind & Higgins, 1995).',
      ],
    },
    {
      title: 'The name or the sound of each letter',
      paras: [
        'Letter-name knowledge is one of the best predictors of learning to read (Foulin, 2005), and explicit instruction in letter names and sounds improves this knowledge (Piasta & Wagner, 2010). The name of a letter (“bee”, “cee”) is stable, and it is what school and family use to spell words out; the sound is what makes it possible to read and write new words. The app offers both options, but not at the same time, so as not to duplicate information or lengthen the wait between keys.',
        'In transparent orthographies, such as Spanish, the first correspondences between letters and sounds are learnt much faster than in opaque ones, such as English (Seymour et al., 2003). This suggests that, in languages with regular correspondences, the sound of each letter is a particularly useful clue for writing. Recorded letter sounds are only available in Catalan and Spanish; they were recorded with a human voice because synthetic voices do not pronounce isolated sounds well. In speech, sounds are coarticulated, so pronouncing an isolated phoneme always distorts it slightly, and consonants such as /p/, /t/ or /l/ are particularly hard to say on their own (Garriga Ferriol, 2003a); this is why it matters that a person pronounces them.',
        'Moreover, the correspondence between letters and sounds is not always one to one. In Catalan, for example, the same sound can be written with different letters, as /s/ with s, ss, c or ç, and the same letter, such as g, can stand for different sounds (Garriga Ferriol, 2003a). The sound of the letter guides the writer but does not settle every spelling decision; it is therefore worth combining it with the letter name and with reading the whole word.',
        'Correspondences between letters and sounds are the skill with the most consistent evidence in children with intellectual disability who use AAC, and interventions that combine them with sound blending and segmentation produce broader gains (Ulriksen et al., 2026b). In the phonological awareness programme adapted into Catalan by Garriga Ferriol (2003b), oral work leads to activities with letters and spelling, because training is more effective when correspondences between sounds and letters are taught at the same time. Writing while hearing the sound of each letter, or spelling a word out with its sounds, is one way of applying these correspondences, which the adult can combine with teaching sound blending and segmentation.',
      ],
    },
    {
      title: 'Reading aloud and spelling out',
      paras: [
        'Reading on demand highlights the sentence and, when the speech engine allows it, the word being heard, so that the text arrives through sight and hearing at the same time. This bimodal presentation improved the comprehension of less skilled readers compared with presentation through a single channel (Montali & Lewandowski, 1996), and a meta-analysis of text-to-speech and other read-aloud tools for students with reading disabilities found a small-to-moderate positive effect on comprehension (0.35; Wood et al., 2018). Highlighting the text while it is heard follows the temporal contiguity principle of multimedia learning (Mayer, 2021).',
        'When a single word is selected, the option “Spell” appears: it highlights each letter in order while saying its sound with a recorded voice or, if the settings ask for it, its name, mentioning capital letters; in languages without recorded sounds it always says the name. It makes the spelling structure of the word visible, combines written and spoken feedback, as in the studies by Schlosser and Blischak (2004), and lets a person check how a word is written without depending on someone else. Spelling with sounds resembles the decoding feature of some communication apps designed to support the transition to literacy, which highlights each letter while the voice says its sound (Holyfield et al., 2026): in eight studies with 32 children, adolescents and adults with developmental disabilities who use AAC, it improved decoding and knowledge of the correspondences between letters and sounds (Light et al., 2025). Spelling with names draws on letter-name knowledge, one of the best predictors of learning to read (Foulin, 2005).',
      ],
    },
    {
      title: 'The voices',
      paras: [
        'The intelligibility of synthetic speech varies from one synthesizer to another and is lower for children than for adults (Mirenda & Beukelman, 1987; Drager et al., 2010). This is why the app lets users choose between the voices installed on the device and free neural voices that work offline, and adjust their rate, pitch and volume. The voice should be chosen by trying it with the person concerned.',
      ],
    },
    {
      title: 'The pictograms',
      paras: [
        'Pictograms can help or hinder, depending on the goal. For understanding a text, the evidence is mixed: in one study, symbols improved the text comprehension of adults with intellectual disabilities (Jones et al., 2007), but in another they did not improve it compared with text alone (Poncelas & Murphy, 2007); even adults without disabilities interpreted isolated pictograms representing abstract statements with little success (Benson-Goldberg & Erickson, 2020).',
        'For learning to recognise the written word, on the other hand, the picture can draw attention away and slow learning down (Samuels, 1970). In a study with six students, five learnt the words presented without a picture faster (Didden et al., 2000); in another, students were more successful when they actively matched pictures to printed words than when the words were presented together with the picture (Fossett & Mirenda, 2006). Symbols can help in learning words when they are combined with specific teaching strategies (Sheehy, 2002) but, in general, Erickson et al. (2010) advise against pairing pictures with the words that students are expected to learn to read or spell.',
        'Recent reviews add two findings. There is no evidence that knowing graphic symbols directly helps in acquiring conventional literacy skills, such as phonological awareness, correspondences between letters and sounds or encoding, because, unlike letters, pictograms bear no relation to the sounds of the word (Light et al., 2025). And the static text label that many communication apps place above the symbol may interfere with learning the written word (Caron et al., 2021).',
        'LECAA Docs applies these findings in four ways. The pictogram appears once the word has been written: the person writes from the letters, and the pictogram confirms the meaning. By default there are none for articles, prepositions, conjunctions and weak pronouns, so that visual support is concentrated on content words. They can be hidden with a single button. And the settings allow them to fade after a few seconds or to show only when the word is touched, so that the picture competes less with the text and visual support can be withdrawn gradually. The same idea, keeping the written word at the centre, underlies communication apps that show the text dynamically when a pictogram is selected: combined with speech output, this improved the written word recognition of five participants with autism (Caron et al., 2018) and of four boys aged 9 to 18 with severe autism and very little speech (Caron et al., 2021); overall, in nine studies with 37 participants, 89% improved in word reading (Light et al., 2025). Caron et al. (2021) also propose gradually withdrawing the pictograms as the person learns the words, to ease the transition to alphabetic writing; the option to fade pictograms responds to this proposal.',
        'Saved and printed documents include all the pictograms so that other readers, such as the family, can benefit from them, bearing in mind that the effect of symbols on comprehension varies from person to person (Jones et al., 2007; Poncelas & Murphy, 2007).',
      ],
    },
    {
      title: 'Keyboards and motor access',
      paras: [
        'LECAA Docs has no keyboard of its own: it works with physical keyboards and with each system’s on-screen keyboard. The person thus writes with the same access method used in other apps, and with the system accessibility settings already in place, in line with the principle of matching tools to each person’s abilities and needs that guides AAC intervention (Beukelman & Light, 2020). This is particularly important because motor difficulties cause characteristic keyboard errors (Trewin & Pain, 1999).',
        'Writing with one’s usual access method also matters when assessing what a person knows. In a review of print knowledge assessments used with students who use AAC, more than 40% required a way of responding different from the one the student used to communicate, and the authors recommend that the person be able to take part with their usual system and access method (Collins et al., 2024).',
      ],
    },
    {
      title: 'Typing protection',
      paras: [
        'The option not to accept keys while feedback is playing makes each spoken message be heard in full before the next key. It prevents information from overlapping and, according to cognitive load theory and the temporal contiguity principle, makes it easier to relate each sound to what has just been written (Sweller, 1988; Mayer, 2021).',
      ],
    },
    {
      title: 'Typefaces',
      paras: [
        'The app includes several typefaces with clear letter shapes so that each person can use the one they read best. Special typefaces for dyslexia have not shown benefits: OpenDyslexic did not improve the reading rate or accuracy of students with dyslexia (Wery & Diliberto, 2017), and Dyslexie did not improve the reading of children with or without dyslexia (Kuster et al., 2018). OpenDyslexic is included because some people prefer it, not because it improves reading. Wider spacing between letters, by contrast, did improve the reading of children with dyslexia (Zorzi et al., 2012). The joined script (Playwrite ES, a school model) allows work on screen with the same letter model as in the classroom, for consistency with school practice.',
      ],
    },
    {
      title: 'Documents and monitoring',
      paras: [
        'Each document is saved with the day it was started and the day of its last change, so that the development of each person’s writing can be seen. A meta-analysis found that feedback on writing improves text quality whether it comes from adults (mean effect 0.87), peers (0.58), the writers themselves (0.62) or computers (0.38), whereas monitoring progress on its own did not improve it meaningfully (Graham et al., 2015). A collection of dated texts is therefore useful above all as a basis for feedback. In addition, since there are few standardised reading and writing tests adapted to people who do not speak (Collins et al., 2024; Ulriksen et al., 2026b), the texts a person writes with their usual access method are a valuable source of information for following their progress. Documents are saved only on the device and are not sent anywhere.',
      ],
    },
    {
      title: 'Six languages',
      paras: [
        'The app works in Catalan, Spanish, Basque, Galician, English and French, each with its own letter names, voices, pictograms and settings, so that people can write in the language of school and in the language of home. According to the linguistic interdependence hypothesis, academic and literacy skills developed in one language can transfer to the other (Cummins, 1979).',
      ],
    },
    {
      title: 'The app, teaching and the family',
      paras: [
        'LECAA Docs is designed for practising writing within explicit and systematic teaching, which is the most effective with AAC users: the adult models the skill, guides practice, gives corrective feedback and offers many opportunities to practise (Ulriksen et al., 2026b; Babb & Caron, 2026). Apps help as a supplement. In a study of 123 students with intellectual disability, the authors conclude that digital apps can support reading instruction when used under the guidance of teachers (Palmqvist et al., 2025), and the dynamic text features of communication apps are designed to complement instruction (Caron et al., 2021; Light et al., 2025).',
        'Combining several skills also gives good results. In the Swedish study, the group that combined a phonics programme and a comprehension programme improved more in phonological awareness than the others (Palmqvist et al., 2025), and four children who use AAC improved at the same time in sound blending, decoding and high-frequency word reading with a literacy app that their mothers, trained remotely, used five days a week at home (Babb & Caron, 2026). This last study shows that the family can play an active role if it receives training and support; Garriga Ferriol (2003a) also highlights the role of the family as a facilitator of learning to read. Because LECAA Docs works the same way at home and at school, in a browser and without installation, it supports this continuity.',
      ],
    },
    {
      title: 'Every option can be adjusted',
      paras: [
        'Universal Design for Learning recommends offering multiple means of perceiving information, of engagement and of expression (CAST, 2024). Since the response to each kind of support varies from person to person (Schlosser & Blischak, 2004), every option in LECAA Docs can be set separately, and each language keeps its own settings. It is recommended to choose them on the basis of systematic observation of each person and to review them as the person progresses. Nor is there a single method that suits everyone: on literacy for deaf students, for example, Garriga Ferriol (2003a) concludes that the approach should be chosen according to each student’s situation.',
      ],
    },
  ],
  references: 'References',
};

export default text;
