// The text of the "Marc teòric" in one language: an introduction, the sections (one for each group of
// options of the app) and the title of the references. *Text between asterisks* is shown in italics.
export interface Framework {
  intro: string[];
  sections: { title: string; paras: string[] }[];
  references: string;
}
