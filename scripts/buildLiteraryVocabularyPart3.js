// scripts/buildLiteraryVocabularyPart3.js
const { dictionaryManager } = require("../lib/DictionaryPartitionManager.ts");

const VOCAB_PART_3 = [
  // --- G ---
  ["gainsay", "verb", "Deny or contradict a fact or statement; speak against.", ["No one in the courtroom dared gainsay the testimony of the white deputy."], ["gainsaid"]],
  ["galvanize", "verb", "Shock or excite someone into taking action.", ["The horrific discovery of the burial ground served to galvanize the civil rights committee."], ["galvanized", "galvanizing"]],
  ["garish", "adjective", "Obtrusively bright and showy; lurid.", ["The bright garish electric lights of the carnival contrasted sharply with the gloom of the quarantine."], ["garishly"]],
  ["garrulous", "adjective", "Excessively talkative, especially on trivial matters.", ["The garrulous old barber continued to gossip while shaving customers under curfew."], ["garrulously"]],
  ["gaunt", "adjective", "Lean and haggard, especially because of suffering, hunger, or age.", ["The gaunt faces of the solitary confinement prisoners stared through the iron bars."], ["gauntness"]],
  ["genial", "adjective", "Friendly and cheerful.", ["The genial smile of the headmaster concealed years of institutional cruelty."], ["genially"]],
  ["gibe", "noun", "An insulting or mocking remark; a taunt.", ["The older boys shouted cruel gibes at the terrified newcomer."], ["gibes", "gibed"]],
  ["gloom", "noun", "Partial or total darkness; a state of depression or despondency.", ["A heavy, unyielding gloom settled over Gregor's locked bedroom."], ["gloomy"]],
  ["gluttony", "noun", "Habitual greed or excess in eating.", ["While the inmates starved, the staff indulged in private gluttony behind closed doors."], ["glutton", "gluttonous"]],
  ["goad", "verb", "Provoke or annoy someone so as to stimulate some action or reaction.", ["The guards would intentionally goad the boys to elicit an excuse for corporal punishment."], ["goaded", "goading"]],
  ["grandiose", "adjective", "Impressive and imposing in appearance or style, especially pretentiously so.", ["The superintendent outlined grandiose plans for a vocational academy that never materialized."], ["grandiosely"]],
  ["gratuitous", "adjective", "Uncalled for; lacking good reason; unwarranted.", ["The second round of blows with the rubber hose was purely gratuitous cruelty."], ["gratuitously"]],
  ["gravity", "noun", "Extreme or alarming importance; seriousness; solemnity.", ["Dr. Rieux understood the full gravity of the situation before the municipal council did."], []],
  ["gregarious", "adjective", "Fond of company; sociable.", ["Before his transformation, Gregor had not been particularly gregarious, preferring quiet evenings at home."], ["gregariously"]],
  ["grievance", "noun", "A real or imagined wrong or other cause for complaint or protest, especially unfair treatment.", ["Elwood drafted a formal letter documenting the inmates' legitimate grievances."], ["grievances"]],
  ["grimace", "noun", "An ugly, twisted expression on a person's face, typically expressing disgust, pain, or wry amusement.", ["Gregor's father made a violent grimace before brandishing his cane."], ["grimaced", "grimaces"]],
  ["grotesque", "adjective", "Comically or repulsively ugly or distorted.", ["The sight of the giant insect clinging to the flowered wallpaper was profoundly grotesque."], ["grotesquely"]],
  ["grovel", "verb", "Act in an obsequious way in order to obtain someone's forgiveness or favor; lie or crawl abjectly on the ground.", ["Turner warned Elwood never to grovel before the overseers, as it only provoked more contempt."], ["groveled", "groveling"]],
  ["grueling", "adjective", "Extremely tiring and demanding.", ["The twelve-hour shifts in the citrus groves under the boiling sun were grueling."], []],
  ["guile", "noun", "Sly or cunning intelligence.", ["Turner survived at Nickel through quick wits, silence, and protective guile."], ["guileful", "guileless"]],
  ["gullible", "adjective", "Easily persuaded to believe something; credulous.", ["Elwood was not gullible, but his deep faith in justice made him vulnerable to betrayal."], ["gullibility"]],

  // --- H ---
  ["hackneyed", "adjective", "Lacking significance through having been overused; unoriginal and trite.", ["The principal repeated hackneyed platitudes about hard work and moral redemption."], []],
  ["haggard", "adjective", "Looking exhausted and unwell, especially from fatigue, worry, or suffering.", ["Cash Bundren looked gaunt and haggard after three sleepless nights beside the river."], ["haggardly"]],
  ["halcyon", "adjective", "Denoting a period of time in the past that was idyllically happy and peaceful.", ["Gregor looked back on his early school days as a halcyon era that would never return."], []],
  ["harangue", "verb", "Lecture someone at length in an aggressive and critical manner.", ["The dormitory supervisor would harangue the exhausted boys before releasing them to sleep."], ["harangued", "haranguing"]],
  ["harbinger", "noun", "A person or thing that announces or signals the approach of another.", ["The discovery of dead rats in the stairwells was the horrifying harbinger of the epidemic."], ["harbingers"]],
  ["haughty", "adjective", "Arrogantly superior and disdainful.", ["The three lodgers maintained a haughty demeanor, treating Gregor's mother like a servant."], ["haughtily", "haughtiness"]],
  ["heedless", "adjective", "Showing a reckless lack of care or attention.", ["The driver plunged into the flooded ford, heedless of the churning brown current."], ["heedlessly"]],
  ["hegemony", "noun", "Leadership or dominance, especially by one country or social group over others.", ["The white minority maintained political and economic hegemony across the Florida panhandle."], ["hegemonic"]],
  ["heinous", "adjective", "Utterly odious or wicked, especially of a person or wrongful act.", ["The clandestine beatings at the White House were heinous crimes that went unpunished for decades."], ["heinously"]],
  ["heresy", "noun", "Belief or opinion contrary to orthodox religious or political doctrine.", ["To question the superintendent's disciplinary authority was treated as dangerous heresy."], ["heresies", "heretic", "heretical"]],
  ["hiatus", "noun", "A pause or gap in a sequence, series, or process.", ["The court proceedings went into a prolonged hiatus while state auditors examined the school books."], ["hiatuses"]],
  ["hierarchy", "noun", "A system or organization in which people or groups are ranked one above the other according to status or authority.", ["A rigid racial hierarchy governed every interaction on the campus."], ["hierarchical", "hierarchies"]],
  ["hinder", "verb", "Create difficulties for someone or something, resulting in delay or obstruction.", ["Gregor's rounded, awkward carapace hindered every attempt to slip through the narrow doorway."], ["hindered", "hindering", "hindrance"]],
  ["histrionic", "adjective", "Overly theatrical or melodramatic in character or style.", ["The lawyer delivered a histrionic plea to the jury, waving a miniature American flag."], ["histrionics"]],
  ["homage", "noun", "Special honor or respect shown publicly.", ["The town gathered to pay solemn homage to the volunteer doctors who had fallen."], []],
  ["hubris", "noun", "Excessive pride or self-confidence.", ["The mayor's hubris blinded him to the rapid spread of the contagion until it was too late."], []],
  ["humility", "noun", "A modest or low view of one's own importance; humbleness.", ["Dr. Rieux performed his exhausting medical duties with quiet, unpretentious humility."], []],
  ["hypocrisy", "noun", "The practice of claiming to have moral standards or beliefs to which one's own behavior does not conform.", ["The school's Christian motto was an obscene hypocrisy in light of the cemetery behind the school."], ["hypocrisies", "hypocritical"]],

  // --- I ---
  ["iconoclast", "noun", "A person who attacks cherished beliefs or institutions.", ["Turner was a natural iconoclast who dismantled every official excuse with sharp wit."], ["iconoclasts", "iconoclastic"]],
  ["idiosyncrasy", "noun", "A mode of behavior or way of thought peculiar to an individual.", ["Each member of the Bundren family possessed an idiosyncratic response to their mother's death."], ["idiosyncrasies", "idiosyncratic"]],
  ["ignoble", "adjective", "Not honorable in character or purpose; of low social status.", ["The trustees used their office for the ignoble purpose of personal enrichment."], ["ignobly"]],
  ["ignominious", "adjective", "Deserving or causing public disgrace or shame.", ["The boy suffered an ignominious defeat before the gathered assembly in the cafeteria."], ["ignominiously", "ignominy"]],
  ["illicit", "adjective", "Forbidden by law, rules, or custom.", ["The boys traded illicit cigarettes behind the laundry boiler after midnight."], ["illicitly"]],
  ["immutable", "adjective", "Unchanging over time or unable to be changed.", ["The laws of segregation seemed immutable until the civil rights boycotts began."], ["immutably"]],
  ["impasse", "noun", "A situation in which no progress is possible, especially because of disagreement; a deadlock.", ["The council reached an impasse over whether to declare an immediate quarantine."], ["impasses"]],
  ["impassive", "adjective", "Not feeling or showing emotion.", ["The judge maintained an impassive expression while handing down the maximum sentence."], ["impassively"]],
  ["impeccable", "adjective", "In accordance with the highest standards of propriety; faultless.", ["Before his arrest, Elwood's academic and behavioral record had been impeccable."], ["impeccably"]],
  ["impediment", "noun", "A hindrance or obstruction in doing something.", ["His heavy leg cast was an unbearable impediment on the muddy trek to town."], ["impediments"]],
  ["imperious", "adjective", "Assuming power or authority without justification; arrogant and domineering.", ["The head clerk spoke in an imperious tone that brooked no contradiction."], ["imperiously"]],
  ["impermeable", "adjective", "Not allowing fluid to pass through.", ["The quarantine barrier was designed to be completely impermeable to civilian traffic."], []],
  ["impetuous", "adjective", "Acting or done quickly and without thought or care.", ["The boy made an impetuous dash for the tree line, not seeing the armed guard on the ridge."], ["impetuously"]],
  ["implacable", "adjective", "Unable to be placated; relentless; unstoppable.", ["The advancing floodwaters were an implacable force that swept away the cotton fields."], ["implacably"]],
  ["implicit", "adjective", "Implied though not plainly expressed; with no qualification or doubt.", ["There was an implicit understanding among the inmates that what happened at the White House was never discussed."], ["implicitly"]],
  ["impolitic", "adjective", "Failing to possess or display practical judgment or prudence; unwise.", ["It was highly impolitic to question the superintendent in front of the visiting trustees."], []],
  ["importune", "verb", "Harass someone persistently for or to do something.", ["Gregor's mother began to importune the doctor for an ointment to soothe the insect's wounds."], ["importuned", "importuning"]],
  ["impoverish", "verb", "Make a person or area poor; exhaust the strength or vitality of.", ["The five-year illness had served to completely impoverish Gregor's aging parents."], ["impoverished", "impoverishing"]],
  ["imprecation", "noun", "A spoken curse.", ["Anse muttered dark imprecations against the road commissioner as the wagon tilted into the ditch."], ["imprecations"]],
  ["impromptu", "adjective", "Done without being planned, organized, or rehearsed.", ["The volunteer sanitation squad held an impromptu strategy meeting in the pharmacy."], []],
  ["improvident", "adjective", "Not having or showing foresight; spendthrift or thoughtless.", ["Anse's improvident management had left the farm burdened with debt and mortgages."], ["improvidently"]],
  ["impugn", "verb", "Dispute the truth, validity, or honesty of a statement or motive; call into question.", ["The prosecutor sought to impugn the character of the lone defense witness."], ["impugned", "impugning"]],
  ["impunity", "noun", "Exemption from punishment or freedom from the injurious consequences of an action.", ["The guards operated with total impunity, knowing that no court would believe an inmate."], []],
  ["inadvertent", "adjective", "Not resulting from or achieved through deliberate planning; accidental.", ["An inadvertent slip of the foot sent Cash plunging into the raging river current."], ["inadvertently"]],
  ["inane", "adjective", "Silly; stupid.", ["The local radio host continued to broadcast inane chatter while bodies piled up in the mortuary."], ["inanely"]],
  ["inarticulate", "adjective", "Unable to speak distinctly or express oneself clearly.", ["Gregor's vocal cords produced only an inarticulate, wheezing hiss."], ["inarticulately"]],
  ["inauspicious", "adjective", "Not conducive to success; unpromising.", ["The grey drizzle and flooded bridge made for an inauspicious start to the funeral journey."], ["inauspiciously"]],
  ["incendiary", "adjective", "Designed to cause fires; tending to stir up conflict.", ["The sheriff confiscated the civil rights flyers, labeling them incendiary propaganda."], []],
  ["incessant", "adjective", "Continuing without pause or interruption, especially of something regarded as unpleasant.", ["The incessant buzzing of green bottle flies around the wagon became maddening."], ["incessantly"]],
  ["inchoate", "adjective", "Just begun and so not fully formed or developed; rudimentary.", ["Gregor felt an inchoate grief for the human life slipping steadily away from him."], []],
  ["incipient", "adjective", "In an initial stage; beginning to happen or develop.", ["Dr. Rieux noted the incipient swellings under the patient's armpits with sinking heart."], []],
  ["incisive", "adjective", "Intelligently analytical and clear-thinking; sharp.", ["Turner offered incisive observations about the brutal economics of the reform school."], ["incisively"]],
  ["inclement", "adjective", "Of the weather unpleasantly cold or wet.", ["The inclement weather worsened the condition of the injured boys working outside."], []],
  ["incongruous", "adjective", "Not in harmony or keeping with the surroundings or other aspects of something.", ["The polished mahogany desk looked absurdly incongruous in the dingy cinderblock office."], ["incongruously"]],
  ["inconsolable", "adjective", "Not able to be comforted or alleviated of grief.", ["The young mother was inconsolable as the quarantine van carried her feverish child away."], ["inconsolably"]],
  ["incorrigible", "adjective", "Not able to be corrected, improved, or reformed of a person or their tendencies.", ["The court labeled Elwood an incorrigible delinquent after a five-minute hearing."], []],
  ["incredulous", "adjective", "Unwilling or unable to believe something.", ["The family stared with incredulous horror as Gregor scuttled across the wooden ceiling."], ["incredulously"]],
  ["inculcate", "verb", "Instill an attitude, idea, or habit by persistent instruction.", ["The academy sought to inculcate unquestioning submission in its young inmates."], ["inculcated", "inculcating"]],
  ["indefatigable", "adjective", "Persisting tirelessly of a person or their efforts.", ["Dr. Rieux proved an indefatigable servant of the sick, working through the night without sleep."], ["indefatigably"]],
  ["indifferent", "adjective", "Having no particular interest or sympathy; unconcerned.", ["The townspeople were initially indifferent to the plight of the poor in the outer wards."], ["indifferently", "indifference"]],
  ["indigenous", "adjective", "Originating or occurring naturally in a particular place; native.", ["The bacillus was not indigenous to the city, but had arrived via cargo ships from the Orient."], []],
  ["indignation", "noun", "Anger or annoyance provoked by what is perceived as unfair treatment.", ["Gregor felt a surge of bitter indignation when his sister declared him a burden."], ["indignant"]],
  ["indolent", "adjective", "Wanting to avoid activity or exertion; lazy.", ["His father had become an indolent old man who spent his days dozing in his dressing gown."], ["indolently", "indolence"]],
  ["ineffable", "adjective", "Too great or extreme to be expressed or described in words.", ["The mother experienced an ineffable sorrow as the hearse moved toward the burial ground."], ["ineffably"]],
  ["ineluctable", "adjective", "Unable to be resisted or avoided; inescapable.", ["The spread of the contagion across the working-class wards seemed ineluctable."], ["ineluctably"]],
  ["inept", "adjective", "Having or showing no skill; clumsy.", ["The municipal administration proved woefully inept at distributing emergency food supplies."], ["ineptly", "ineptitude"]],
  ["inert", "adjective", "Lacking the ability or strength to move.", ["Gregor lay inert upon his back, staring at the ceiling as dusk fell over the room."], ["inertia"]],
  ["inexorable", "adjective", "Impossible to stop or prevent; impossible to persuade by request or entreaty.", ["The progression of the septic fever was swift, brutal, and completely inexorable."], ["inexorably"]],
  ["infallible", "adjective", "Incapable of making mistakes or being wrong.", ["The preacher spoke as if his interpretation of divine punishment were completely infallible."], ["infallibility"]],
  ["infamous", "adjective", "Well known for some bad quality or deed.", ["The White House was infamous among generations of Florida boys as a place of terror."], ["infamy"]],
  ["infirmity", "noun", "Physical or mental weakness.", ["Gregor's father cited his chronic infirmity as an excuse for not seeking employment."], ["infirmities"]],
  ["ingenuous", "adjective", "Innocent and unsuspecting.", ["Elwood was too ingenuous to realize that accepting a ride in a strange car could seal his fate."], ["ingenuously"]],
  ["inimical", "adjective", "Tending to obstruct or harm; unfriendly; hostile.", ["The oppressive heat and foul humidity were inimical to the recovery of the fever patients."], []],
  ["iniquity", "noun", "Immoral or grossly unfair behavior.", ["The clandestine graveyard was the ultimate monument to the institution's hidden iniquity."], ["iniquities"]],
  ["injudicious", "adjective", "Showing very poor judgment; unwise.", ["It was an injudicious decision to speak to the reporters before securing legal protection."], ["injudiciously"]],
  ["innate", "adjective", "Inborn; natural.", ["Elwood possessed an innate sense of dignity that even the harshest punishment could not extinguish."], ["innately"]],
  ["innocuous", "adjective", "Not harmful or offensive.", ["The initial flea bite seemed completely innocuous until the lymph nodes began to swell."], ["innocuously"]],
  ["inordinate", "adjective", "Unusually or disproportionately large; excessive.", ["The clerk devoted an inordinate amount of time to lecturing the terrified family."], ["inordinately"]],
  ["insatiable", "adjective", "Impossible to satisfy of an appetite or desire.", ["The state's demand for cheap prison labor seemed insatiable during harvest season."], ["insatiably"]],
  ["inscrutable", "adjective", "Impossible to understand or interpret.", ["The silent, unblinking eyes of the dead rat seemed an inscrutable warning from fate."], ["inscrutably"]],
  ["insidious", "adjective", "Proceeding in a gradual, subtle way, but with harmful effects.", ["The bacillus was an insidious enemy that entered the bloodstream without immediate symptoms."], ["insidiously"]],
  ["insipid", "adjective", "Lacking flavor; lacking vigor or interest.", ["The watered gruel served in the mess hall was cold, greasy, and utterly insipid."], []],
  ["insolent", "adjective", "Showing a rude and arrogant lack of respect.", ["The overseer struck the boy for what he perceived as an insolent stare."], ["insolently", "insolence"]],
  ["insouciance", "noun", "Casual lack of concern; indifference.", ["Turner affected an attitude of cheerful insouciance while planning his midnight escape."], ["insouciant"]],
  ["instigate", "verb", "Bring about or initiate an action or event; incite someone to do something.", ["The warden accused the student of attempting to instigate a general riot among the boys."], ["instigated", "instigating"]],
  ["insular", "adjective", "Ignorant of or uninterested in cultures, ideas, or peoples outside one's own experience.", ["The remote county was an insular community suspicious of all outsiders and federal agents."], ["insularity"]],
  ["insurgent", "adjective", "Rising in active revolt.", ["The civil rights organizers were branded as dangerous insurgent agitators by local deputies."], ["insurgents", "insurgency"]],
  ["insurrection", "noun", "A violent uprising against an authority or government.", ["Fears of a prison insurrection led the superintendent to request armed national guardsmen."], ["insurrections"]],
  ["integral", "adjective", "Necessary to make a whole complete; essential or fundamental.", ["Daily manual labor was an integral component of the school's penal philosophy."], []],
  ["integrity", "noun", "The quality of being honest and having strong moral principles.", ["Elwood preserved his moral integrity even when forced to endure the worst humiliations."], []],
  ["intelligible", "adjective", "Able to be understood; comprehensible.", ["After the transformation, Gregor could no longer produce intelligible human speech."], []],
  ["intercede", "verb", "Intervene on behalf of another.", ["The grandmother traveled to Tallahassee to intercede with the governor on her grandson's behalf."], ["interceded", "interceding"]],
  ["intermittent", "adjective", "Occurring at irregular intervals; not continuous or steady.", ["Intermittent bursts of gunfire echoed from the city perimeter as guards turned back refugees."], ["intermittently"]],
  ["interminable", "adjective", "Endless, often used hyperbolically as of something tiresome.", ["The wagon journey across the muddy bottomland seemed an interminable ordeal to Cash."], ["interminably"]],
  ["interrogate", "verb", "Ask questions of someone, especially a suspect or a prisoner, closely, aggressively, or formally.", ["Deputies took the teenager into the back room to interrogate him without an attorney."], ["interrogated", "interrogating", "interrogation"]],
  ["intransigent", "adjective", "Uncompromising; refusing to agree or compromise.", ["The board of trustees remained intransigent, refusing to permit any federal inspection of the grounds."], ["intransigence"]],
  ["intrepid", "adjective", "Fearless; adventurous.", ["The intrepid journalists documented the secret burial ground despite threats from armed guards."], ["intrepidly"]],
  ["intrinsic", "adjective", "Belonging naturally; essential.", ["Dr. Rieux believed that human dignity was an intrinsic quality that no tyranny could strip away."], ["intrinsically"]],
  ["inundate", "verb", "Overwhelm someone with things or people to be dealt with; flood.", ["Rising floodwaters threatened to inundate the bridge before the wagon could reach the far bank."], ["inundated", "inundating", "inundation"]],
  ["inured", "adjective", "Accustomed to something, especially something unpleasant.", ["The boys had become inured to casual violence, barely flinching when a slap was delivered."], ["inure"]],
  ["invective", "noun", "Insulting, abusive, or highly critical language.", ["The overseer unleashed a torrent of racist invective at the boys who lagged behind."], ["invectives"]],
  ["inveterate", "adjective", "Having a particular habit, activity, or interest that is long-established and unlikely to change.", ["Anse was an inveterate complainer who blamed all his troubles on luck and neighbors."], []],
  ["invidious", "adjective", "Likely to arouse or incur resentment or anger in others; unfairly discriminating; unjust.", ["The warden placed the inmate in the invidious position of having to inform on his bunkmates."], []],
  ["inviolable", "adjective", "Never to be broken, infringed, or dishonored.", ["Elwood believed that human rights were sacred and inviolable, even inside a prison."], []],
  ["invulnerable", "adjective", "Impossible to harm or damage.", ["The school's administration considered itself politically invulnerable until the mass graves were exposed."], []],
  ["irascible", "adjective", "Having or showing a tendency to be easily angered.", ["Gregor's father had grown increasingly irascible, throwing apples at the helpless insect."], ["irascibly"]],
  ["irresolute", "adjective", "Showing or feeling hesitancy; uncertain.", ["The mayor stood irresolute before the reporters, unable to decide whether to declare an emergency."], ["irresolutely"]],
  ["irrevocable", "adjective", "Not able to be changed, reversed, or recovered; final.", ["Gregor knew that his transformation was an irrevocable break with his former human existence."], ["irrevocably"]],

  // --- J & K & L ---
  ["judicious", "adjective", "Having, showing, or done with good judgment or sense.", ["Dr. Rieux made judicious use of the remaining supplies of morphine and disinfectant."], ["judiciously"]],
  ["juncture", "noun", "A particular point in events or time; a place where things join.", ["At this critical juncture, the medical staff had to decide whether to seal the hospital gates."], ["junctures"]],
  ["juxtapose", "verb", "Place or deal with close together for contrasting effect.", ["The author juxtaposed the idyllic Florida landscape with the horrific secret burial ground."], ["juxtaposed", "juxtaposing", "juxtaposition"]],
  ["kinetic", "adjective", "Relating to or resulting from motion.", ["The dormitory was filled with the frantic, kinetic energy of boys hiding contraband before inspection."], []],
  ["knell", "noun", "The sound of a bell, especially when rung solemnly for a death or funeral; an omen of death or end.", ["The tolling bell sounded the death knell of the city's commercial prosperity."], ["knells"]],
  ["lament", "verb", "Express passionate grief or sorrow; mourn.", ["Gregor's mother began to lament aloud the terrible tragedy that had befallen her home."], ["lamented", "lamenting", "lamentation"]],
  ["languid", "adjective", "Displaying or having a disinclination for physical exertion or effort; slow and relaxed.", ["The heat made the prisoners languid, but the overseer's whip quickly broke their lethargy."], ["languidly"]],
  ["languish", "verb", "Grow weak or feeble; suffer from being forced to remain in an unpleasant place or situation.", ["Dozens of children were left to languish in solitary confinement for weeks on end."], ["languished", "languishing"]],
  ["lassitude", "noun", "A state of physical or mental weariness; lack of energy.", ["An overwhelming lassitude overcame the fever patients before delirium set in."], []],
  ["latent", "adjective", "Existing but not yet developed or manifest; hidden or concealed.", ["The epidemic brought out the latent cruelty and cowardice in many respectable citizens."], ["latency"]],
  ["laudable", "adjective", "Deserving praise and commendation.", ["The volunteer sanitation squads performed laudable work under terrifying conditions."], ["laudably"]],
  ["lavish", "adjective", "Sumptuously rich, elaborate, or luxurious.", ["The school's administrative board enjoyed lavish banquets funded by stolen farm profits."], ["lavishly"]],
  ["leery", "adjective", "Cautious or wary due to realistic suspicions.", ["Turner was understandably leery of any promises made by the state investigators."], []],
  ["legitimate", "adjective", "Conforming to the law or to rules; able to be defended with logic or justification.", ["The inmates had legitimate fears that they would never leave the school alive."], ["legitimately", "legitimacy"]],
  ["leniency", "noun", "The fact or quality of being more merciful or tolerant than expected; clemency.", ["The judge showed zero leniency to the Black boy accused of taking a ride in a stolen car."], ["lenient"]],
  ["lethal", "adjective", "Sufficient to cause death; harmful or destructive.", ["The combination of heavy labor, malnutrition, and midnight beatings proved lethal to many."], ["lethally"]],
  ["liability", "noun", "The state of being responsible for something, especially by law; a person or thing whose presence or behavior is likely to cause embarrassment or put one at a disadvantage.", ["To the firm, a sick employee who missed a single train was merely an expensive liability."], ["liabilities"]],
  ["lithe", "adjective", "Thin, supple, and graceful of a person's body.", ["Cash had once been a lithe young farmer before the fall from the church roof crippled him."], ["lithely"]],
  ["litigation", "noun", "The process of taking legal action.", ["Survivors initiated civil litigation against the state of Florida decades after their ordeal."], []],
  ["livid", "adjective", "Furiously angry; dark bluish-gray in color.", ["Livid bruises covered the boy's back after his session in the White House basement."], []],
  ["loath", "adjective", "Reluctant; unwilling.", ["Gregor was loath to show his monstrous appearance to his terrified mother."], []],
  ["loathe", "verb", "Feel intense dislike or disgust for.", ["The boys came to loathe the hypocritical hymns sung at compulsory Sunday chapel."], ["loathed", "loathing"]],
  ["lucid", "adjective", "Expressed clearly; easy to understand; showing ability to think clearly, especially between periods of confusion or insanity.", ["In his few lucid intervals between fever spasms, the patient asked for water."], ["lucidly", "lucidity"]],
  ["lucrative", "adjective", "Producing a great deal of profit.", ["The convict leasing program was an extraordinarily lucrative enterprise for local growers."], []],
  ["ludicrous", "adjective", "So foolish, unreasonable, or out of place as to be amusing; ridiculous.", ["The chief clerk's demand that Gregor immediately board the train seemed completely ludicrous."], ["ludicrously"]],
  ["lugubrious", "adjective", "Looking or sounding sad and dismal.", ["The mournful hoot of the train whistle sounded lugubrious in the dead of night."], ["lugubriously"]],
  ["luminous", "adjective", "Full of or shedding light; bright or shining, especially in the dark.", ["The stars shone with luminous clarity above the cordoned Algerian coastal city."], ["luminosity"]],
  ["lurid", "adjective", "Very vivid in color, especially so as to create an unpleasantly harsh or unnatural effect; presented in vividly shocking or sensational terms.", ["The tabloid newspapers published lurid accounts of the deaths inside the school."], ["luridly"]]
];

console.log(`Starting Part 3 enrichment (Collection size: ${VOCAB_PART_3.length})...`);
let added = 0;
let skipped = 0;

for (const [word, pos, def, examples, variations] of VOCAB_PART_3) {
  const cleanWord = word.trim().toLowerCase();
  if (dictionaryManager.hasWord(cleanWord)) {
    skipped++;
    continue;
  }

  const res = dictionaryManager.addWord({
    word: cleanWord,
    meanings: [{
      partOfSpeech: pos,
      definition: def,
      examples: Array.isArray(examples) ? examples : []
    }],
    variations: Array.isArray(variations) ? variations : []
  }, false);

  if (res.added) {
    added++;
  }
}

const stats = dictionaryManager.getStats();
console.log(`Part 3 completed!`);
console.log(`Newly added: ${added}`);
console.log(`Already existed: ${skipped}`);
console.log(`Total words in dictionary now: ${stats.totalWords}`);
