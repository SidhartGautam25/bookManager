// scripts/seedLiteraryCorpus.js
const { dictionaryManager } = require("../lib/DictionaryPartitionManager.ts");

const LITERARY_WORDS_BATCH1 = [
  // --- The Nickel Boys & Institutional/Civil Rights Vocabulary ---
  {
    word: "reformatory",
    meanings: [{
      partOfSpeech: "noun",
      definition: "An institution to which youthful offenders are sent as an alternative to prison.",
      examples: ["The boys were sentenced to the state reformatory under the pretense of vocational rehabilitation."]
    }],
    variations: ["reformatories"]
  },
  {
    word: "penance",
    meanings: [{
      partOfSpeech: "noun",
      definition: "Voluntary self-punishment inflicted as an outward expression of repentance for having done wrong.",
      examples: ["He endured the backbreaking field work not as a penance, but to avoid the superintendent's belt."]
    }],
    variations: ["penances"]
  },
  {
    word: "truancy",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The action of staying away from school or duties without good reason; absenteeism.",
      examples: ["The officer detained the boy on suspicions of vagrancy and chronic truancy."]
    }],
    variations: ["truancies", "truant"]
  },
  {
    word: "indenture",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A formal legal agreement, contract, or document binding someone to service.",
      examples: ["The state used court indentures to supply cheap juvenile labor to neighboring citrus groves."]
    }],
    variations: ["indentures", "indentured"]
  },
  {
    word: "subjugation",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The action of bringing someone or something under domination or control.",
      examples: ["The school maintained the racial subjugation established by generations of Jim Crow codes."]
    }],
    variations: ["subjugate", "subjugated"]
  },
  {
    word: "disenfranchise",
    meanings: [{
      partOfSpeech: "verb",
      definition: "Deprive someone of a right or privilege, especially the right to vote.",
      examples: ["Laws were designed to disenfranchise Black citizens across the county."]
    }],
    variations: ["disenfranchised", "disenfranchising", "disenfranchisement"]
  },
  {
    word: "cinderblock",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A lightweight building block made of concrete and coal cinders.",
      examples: ["The solitary confinement cells were constructed from cold, gray cinderblocks."]
    }],
    variations: ["cinderblocks"]
  },
  {
    word: "retribution",
    meanings: [{
      partOfSpeech: "noun",
      definition: "Punishment inflicted on someone as vengeance for a wrong or criminal act.",
      examples: ["The superintendent's nocturnal visits to the dormitory were feared as sudden retribution."]
    }],
    variations: ["retributive"]
  },
  {
    word: "reprieve",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A cancellation or postponement of a punishment; temporary relief.",
      examples: ["A sudden rainstorm offered the field crew a momentary reprieve from the sweltering sun."]
    }],
    variations: ["reprieves", "reprieved"]
  },
  {
    word: "contraband",
    meanings: [{
      partOfSpeech: "noun",
      definition: "Goods that have been imported or exported illegally; forbidden items.",
      examples: ["The boys hid magazines and stolen sugar as precious contraband inside mattress seams."]
    }],
    variations: []
  },
  {
    word: "harrowing",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Acutely distressing, painful, or traumatic.",
      examples: ["He recounted harrowing memories of the White House beatings decades later in New York."]
    }],
    variations: ["harrowingly"]
  },
  {
    word: "transgression",
    meanings: [{
      partOfSpeech: "noun",
      definition: "An act that goes against a law, rule, or code of conduct; an offense.",
      examples: ["Speaking out of turn during inspection was treated as a grave transgression."]
    }],
    variations: ["transgressions", "transgress"]
  },
  {
    word: "superintendent",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A person who directs or manages a place, department, or organization.",
      examples: ["The superintendent ruled the reform academy with unquestioned bureaucratic authority."]
    }],
    variations: ["superintendents"]
  },
  {
    word: "solitary",
    meanings: [{
      partOfSpeech: "noun",
      definition: "Confinement of a prisoner alone in a cell as a punishment.",
      examples: ["Turner was thrown into solitary for whispering during the evening lineup."]
    }],
    variations: []
  },
  {
    word: "calloused",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Having hardened, thickened areas of skin; made insensitive or unfeeling.",
      examples: ["Years of cutting cane left his hands calloused and his demeanor guarded."]
    }],
    variations: ["callous", "callously"]
  },
  {
    word: "furlough",
    meanings: [{
      partOfSpeech: "noun",
      definition: "Leave of absence, especially that granted to a member of the armed services or a prisoner.",
      examples: ["None of the boys in the industrial hall were ever granted holiday furloughs."]
    }],
    variations: ["furloughs"]
  },
  {
    word: "probation",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The release of an offender from detention, subject to a period of good behavior under supervision.",
      examples: ["The social worker promised Elwood a hearing for early probation if he avoided demerits."]
    }],
    variations: ["probationary"]
  },
  {
    word: "inequity",
    meanings: [{
      partOfSpeech: "noun",
      definition: "Lack of fairness or justice; unfairness.",
      examples: ["The stark inequity between the white campus and the black campus was immediately apparent."]
    }],
    variations: ["inequities"]
  },
  {
    word: "ostracize",
    meanings: [{
      partOfSpeech: "verb",
      definition: "Exclude someone from a society or group.",
      examples: ["Anyone who cooperated with the state investigators risked being ostracized by the guards."]
    }],
    variations: ["ostracized", "ostracizing", "ostracism"]
  },
  {
    word: "tenement",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A room or a set of rooms forming a separate residence within a house or block of apartments.",
      examples: ["He remembered his grandmother's warm tenement flat far away in Tallahassee."]
    }],
    variations: ["tenements"]
  },
  {
    word: "recalcitrant",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Having an obstinately uncooperative attitude toward authority or discipline.",
      examples: ["The overseer singled out the recalcitrant youths for heavy labor in the gravel pit."]
    }],
    variations: ["recalcitrance"]
  },
  {
    word: "sweatbox",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A small, windowless cell or shed used as punishment, typically in extreme heat.",
      examples: ["The boys whispered terrifying stories about prisoners locked inside the tin-roofed sweatbox."]
    }],
    variations: ["sweatboxes"]
  },
  {
    word: "exhumation",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The action of digging up something buried, especially a corpse.",
      examples: ["The forensic team began the exhumation of secret graves behind the abandoned school."]
    }],
    variations: ["exhumations", "exhume"]
  },
  {
    word: "indomitable",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Impossible to subdue or defeat; persevering bravely.",
      examples: ["Even amidst brutal discipline, Elwood retained an indomitable faith in Dr. King's teachings."]
    }],
    variations: ["indomitably"]
  },
  {
    word: "penitentiary",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A prison for people convicted of serious crimes.",
      examples: ["The older boys warned that the reform school was merely an anteroom to the state penitentiary."]
    }],
    variations: ["penitentiaries"]
  },

  // --- The Metamorphosis & Kafkaesque Themes ---
  {
    word: "carapace",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A hard upper shell or protective covering of an insect, crustacean, or turtle.",
      examples: ["Gregor lay on his back, feeling his domed, brown carapace pressing against the mattress."]
    }],
    variations: ["carapaces"]
  },
  {
    word: "antennae",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A pair of long, thin sensory appendages on the heads of insects and other arthropods.",
      examples: ["His delicate antennae twitched involuntarily in the cool morning air of his bedroom."]
    }],
    variations: ["antenna"]
  },
  {
    word: "subservience",
    meanings: [{
      partOfSpeech: "noun",
      definition: "Willingness to obey others unquestioningly; servility.",
      examples: ["Years of subservience to the firm had stifled Gregor's independence and pride."]
    }],
    variations: ["subservient"]
  },
  {
    word: "alienation",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The state or experience of being isolated from a group or an activity to which one should belong.",
      examples: ["His grotesque physical state completed the psychological alienation he had long felt from his family."]
    }],
    variations: ["alienate", "alienated"]
  },
  {
    word: "sluggish",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Slow-moving, inactive, or lacking in energy.",
      examples: ["His multiple tiny legs moved with frustratingly sluggish coordination."]
    }],
    variations: ["sluggishly", "sluggishness"]
  },
  {
    word: "lethargy",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A state of weariness, fatigue, and lack of energy or enthusiasm.",
      examples: ["A dull lethargy overtook Gregor as days turned into weeks behind his closed door."]
    }],
    variations: ["lethargic"]
  },
  {
    word: "squeamish",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Easily made to feel sick, faint, or disgusted, especially by unpleasant sights.",
      examples: ["Grete became less squeamish about cleaning the room, though she still averted her gaze."]
    }],
    variations: ["squeamishness"]
  },
  {
    word: "monstrosity",
    meanings: [{
      partOfSpeech: "noun",
      definition: "Something, especially a building or animal, that is very large and unsightly or grotesque.",
      examples: ["His father viewed the insect on the carpet as an intolerable monstrosity."]
    }],
    variations: ["monstrosities", "monstrous"]
  },
  {
    word: "estrangement",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The fact of being no longer on friendly terms or in social contact with someone.",
      examples: ["The door locked between them symbolized an irreversible emotional estrangement."]
    }],
    variations: ["estrange", "estranged"]
  },
  {
    word: "breadwinner",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A person who earns money to support a family.",
      examples: ["Gregor took immense pride in having been the sole breadwinner for his parents and sister."]
    }],
    variations: ["breadwinners"]
  },
  {
    word: "exasperation",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A feeling of intense irritation or annoyance.",
      examples: ["The chief clerk shook his cane in rising exasperation at Gregor's incomprehensible excuses."]
    }],
    variations: ["exasperate", "exasperated"]
  },
  {
    word: "chitinous",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Composed of or resembling chitin; tough, horny, and characteristic of arthropod exoskeletons.",
      examples: ["His chitinous shell produced a dry, clicking scrape as he turned toward the wall."]
    }],
    variations: ["chitin"]
  },
  {
    word: "vestibule",
    meanings: [{
      partOfSpeech: "noun",
      definition: "An antechamber, hall, or lobby next to the outer door of a building.",
      examples: ["The lodgers gathered in the vestibule to demand an immediate explanation from the landlord."]
    }],
    variations: ["vestibules"]
  },
  {
    word: "transom",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A strengthening crossbar, in particular one set above a window or door.",
      examples: ["Faint daylight filtered through the glass transom above the bedroom door."]
    }],
    variations: ["transoms"]
  },
  {
    word: "claustrophobia",
    meanings: [{
      partOfSpeech: "noun",
      definition: "Extreme or irrational fear of confined places.",
      examples: ["The clutter of rejected furniture in his room produced a suffocating sense of claustrophobia."]
    }],
    variations: ["claustrophobic"]
  },
  {
    word: "obsequious",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Obedient or attentive to an excessive or servile degree.",
      examples: ["The father adopted an obsequious bow whenever addressing the haughty lodgers."]
    }],
    variations: ["obsequiously", "obsequiousness"]
  },
  {
    word: "pariah",
    meanings: [{
      partOfSpeech: "noun",
      definition: "An outcast; a person who is rejected from society or home.",
      examples: ["Gregor accepted his status as a hidden pariah within the very home he had financed."]
    }],
    variations: ["pariahs"]
  },
  {
    word: "suppurate",
    meanings: [{
      partOfSpeech: "verb",
      definition: "Undergo the formation of pus; fester.",
      examples: ["The lodged apple in his back began to suppurate, causing Gregor constant pain."]
    }],
    variations: ["suppurated", "suppurating", "suppuration"]
  },
  {
    word: "bureaucratic",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Relating to the business of running an organization or government through strict rules and hierarchy.",
      examples: ["The firm operated with cold, bureaucratic ruthlessness that showed no mercy to sick employees."]
    }],
    variations: ["bureaucracy", "bureaucrat"]
  },

  // --- As I Lay Dying & Faulknerian / Southern Gothic ---
  {
    word: "bereavement",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The state of sorrow over the death or departure of a loved one.",
      examples: ["The Bundren family set out across the flooded country during their solemn bereavement."]
    }],
    variations: ["bereave", "bereaved"]
  },
  {
    word: "bier",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A movable frame on which a coffin or a corpse is placed before burial or borne to the grave.",
      examples: ["Cash laid the cedar planks flat across the carpenter's sawhorses to fashion the bier."]
    }],
    variations: ["biers"]
  },
  {
    word: "adze",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A tool similar to an ax with an arched blade at right angles to the handle, used for cutting or shaping wood.",
      examples: ["Cash swung the adze with steady, patient strokes to level the coffin's edges."]
    }],
    variations: ["adzes"]
  },
  {
    word: "bevel",
    meanings: [{
      partOfSpeech: "verb",
      definition: "Reduce a square edge on an object to a sloping edge.",
      examples: ["He carefully beveled the wooden seams so the rain would drain outward from the casket."]
    }],
    variations: ["beveled", "beveling", "bevels"]
  },
  {
    word: "putrefaction",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The process of decay or rotting in a body or other organic matter.",
      examples: ["The summer heat accelerated the putrefaction of the corpse during the nine-day wagon journey."]
    }],
    variations: ["putrefy", "putrescent"]
  },
  {
    word: "macabre",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Disturbing and horrifying because of involvement with or depiction of death and injury.",
      examples: ["The vulture-stalked wagon train became an increasingly macabre spectacle to onlookers in Jefferson."]
    }],
    variations: ["macabrely"]
  },
  {
    word: "carrion",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The decaying flesh of dead animals.",
      examples: ["Black buzzards circled high in the blinding sky, attracted by the scent of carrion."]
    }],
    variations: []
  },
  {
    word: "undertow",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A current in the sea or a river below the surface and moving in a different direction to the surface current.",
      examples: ["The raging river's undertow swept the mules off their feet and threatened to capsize the wagon."]
    }],
    variations: ["undertows"]
  },
  {
    word: "obstinate",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Stubbornly refusing to change one's opinion or chosen course of action.",
      examples: ["Anse remained obstinate in his vow to bury Addie forty miles away in town."]
    }],
    variations: ["obstinately", "obstinacy"]
  },
  {
    word: "conflagration",
    meanings: [{
      partOfSpeech: "noun",
      definition: "An extensive fire that destroys a great deal of land or property.",
      examples: ["Darl set fire to Gillespie's barn, illuminating the night in a raging conflagration."]
    }],
    variations: ["conflagrations"]
  },
  {
    word: "blasphemy",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The act or offense of speaking sacrilegiously about God or sacred things; profane talk.",
      examples: ["Cora regarded Anse's selfish complaining as near to outright blasphemy."]
    }],
    variations: ["blasphemies", "blasphemous"]
  },
  {
    word: "demented",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Driven to irrationality or madness; behaving wildly and erratically.",
      examples: ["Darl's strange laughter sounded demented as the deputies wrestled him toward the train depot."]
    }],
    variations: ["dementedly"]
  },
  {
    word: "parched",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Dried out with heat; extremely thirsty.",
      examples: ["The red clay roads were parched before the sudden summer storm broke over the hills."]
    }],
    variations: ["parch"]
  },
  {
    word: "sepulcher",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A small room or monument, cut in rock or built of stone, in which a dead person is laid or buried.",
      examples: ["She longed for the quiet resting place of the family sepulcher in Jefferson cemetery."]
    }],
    variations: ["sepulchers", "sepulchral"]
  },
  {
    word: "destitute",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Without the basic necessities of life; poverty-stricken.",
      examples: ["The family was destitute, yet Anse somehow acquired new teeth and a gramophone."]
    }],
    variations: ["destitution"]
  },

  // --- The Plague & Camusian / Absurdist / Epidemic Themes ---
  {
    word: "pestilence",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A fatal epidemic disease, especially bubonic plague.",
      examples: ["Dr. Rieux was among the first to acknowledge that the pestilence had besieged Oran."]
    }],
    variations: ["pestilences", "pestilent"]
  },
  {
    word: "bacilli",
    meanings: [{
      partOfSpeech: "noun",
      definition: "Rod-shaped bacteria, especially those causing diseases like plague or tuberculosis.",
      examples: ["Microscopic analysis confirmed the deadly presence of Yersinia bacilli in the lymph nodes."]
    }],
    variations: ["bacillus"]
  },
  {
    word: "quarantine",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A state, period, or place of isolation in which people or animals that have arrived from elsewhere or been exposed to infectious disease are placed.",
      examples: ["The prefecture decreed an immediate quarantine, severing all rail and telegraph communication."]
    }],
    variations: ["quarantined", "quarantining"]
  },
  {
    word: "cordon",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A line or circle of police, soldiers, or guards preventing access to or from an area or building.",
      examples: ["Armed sentries formed a strict cordon sanitaire around the city gates."]
    }],
    variations: ["cordons", "cordoned"]
  },
  {
    word: "bubo",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A swollen, inflamed lymph node in the armpit or groin, characteristic of bubonic plague.",
      examples: ["The patient suffered excruciating pain wherever a dark, tender bubo emerged."]
    }],
    variations: ["buboes"]
  },
  {
    word: "virulence",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The severity or harmfulness of a disease or poison.",
      examples: ["The sudden virulence of the contagion overwhelmed the municipal hospitals within a fortnight."]
    }],
    variations: ["virulent", "virulently"]
  },
  {
    word: "fatalism",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The belief that all events are predetermined and therefore inevitable.",
      examples: ["Father Paneloux initially preached that resignation and religious fatalism were God's will."]
    }],
    variations: ["fatalist", "fatalistic"]
  },
  {
    word: "solidarity",
    meanings: [{
      partOfSpeech: "noun",
      definition: "Unity or agreement of feeling or action, especially among individuals with a common interest; mutual support within a group.",
      examples: ["Tarrou organized volunteer sanitation teams out of profound human solidarity."]
    }],
    variations: []
  },
  {
    word: "existential",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "Relating to human existence, especially the problem of finding meaning in an indifferent universe.",
      examples: ["The epidemic confronted each citizen with an existential choice between cowardice and duty."]
    }],
    variations: ["existentialism", "existentialist"]
  },
  {
    word: "moribund",
    meanings: [{
      partOfSpeech: "adjective",
      definition: "At the point of death; in terminal decline; lacking vitality or vigor.",
      examples: ["Wards overflowed with moribund patients gasping in the suffocating coastal heat."]
    }],
    variations: []
  },
  {
    word: "abatement",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The ending, reduction, or lessening of something, such as disease, pain, or storm.",
      examples: ["The weekly death statistics finally indicated a slight abatement of the fever."]
    }],
    variations: ["abate", "abated"]
  },
  {
    word: "incineration",
    meanings: [{
      partOfSpeech: "noun",
      definition: "The destruction of something by burning, especially waste material or bodies.",
      examples: ["As cemeteries filled to capacity, city officials resorted to night-time incineration."]
    }],
    variations: ["incinerate", "incinerator"]
  },
  {
    word: "fortitude",
    meanings: [{
      partOfSpeech: "noun",
      definition: "Courage in pain or adversity.",
      examples: ["Dr. Rieux performed his grueling rounds each day with unwavering fortitude and compassion."]
    }],
    variations: []
  },
  {
    word: "visitation",
    meanings: [{
      partOfSpeech: "noun",
      definition: "An affliction or punishment viewed as sent by God or fate.",
      examples: ["The preacher described the scourge as a divine visitation intended to awaken slumbering souls."]
    }],
    variations: ["visitations"]
  },
  {
    word: "scourge",
    meanings: [{
      partOfSpeech: "noun",
      definition: "A person or thing that causes great trouble, suffering, or misfortune.",
      examples: ["Generations had forgotten the ancient scourge of the black death until it revisited Oran."]
    }],
    variations: ["scourges", "scourged"]
  }
];

console.log("Seeding Batch 1 words...");
let addedCount = 0;
for (const entry of LITERARY_WORDS_BATCH1) {
  const res = dictionaryManager.addWord(entry, false);
  if (res.added) addedCount++;
}
console.log(`Batch 1 finished! Added ${addedCount} new words to dictionary.`);
