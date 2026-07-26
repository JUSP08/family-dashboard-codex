const PHYSICAL_ACTIVITIES = [
  ["bike-neighborhood", "Neighborhood bike ride", "🚲", 20],
  ["bike-skills", "Bike handling practice", "🚲", 15],
  ["bike-hills", "Bike ride with gentle hills", "🚲", 25],
  ["walk-block", "Walk around the block", "🚶", 10],
  ["walk-brisk", "Brisk neighborhood walk", "🚶", 20],
  ["walk-nature", "Nature walk", "🌿", 25],
  ["walk-family", "Family walk", "👟", 20],
  ["hike-short", "Short trail hike", "🥾", 30],
  ["hike-backyard", "Backyard exploration hike", "🥾", 15],
  ["swim-laps", "Easy swim laps", "🏊", 20],
  ["swim-play", "Active pool play", "🏊", 25],
  ["swim-kicks", "Kickboard or swim-kick practice", "🏊", 15],
  ["run-place", "Run in place", "🏃", 10],
  ["run-walk", "Run and walk intervals", "🏃", 20],
  ["jog-easy", "Easy jog", "🏃", 15],
  ["sprint-yard", "Backyard sprint intervals", "⚡", 10],
  ["jumping-jacks", "Jumping-jack challenge", "⭐", 10],
  ["jump-rope", "Jump-rope practice", "🪢", 15],
  ["hopscotch", "Hopscotch rounds", "🟨", 10],
  ["dance-party", "Dance party", "💃", 20],
  ["dance-learn", "Learn a new dance", "🎵", 25],
  ["freeze-dance", "Freeze-dance rounds", "🎶", 15],
  ["yoga-flow", "Kid-friendly yoga flow", "🧘", 20],
  ["yoga-balance", "Yoga balance poses", "🧘", 10],
  ["stretch-full", "Full-body stretch", "🤸", 10],
  ["stretch-mobility", "Mobility and stretching", "🤸", 15],
  ["animal-walks", "Animal-walk relay", "🐾", 10],
  ["bear-crawl", "Bear-crawl course", "🐻", 10],
  ["crab-walk", "Crab-walk challenge", "🦀", 10],
  ["obstacle-indoor", "Build and run an indoor obstacle course", "🚧", 25],
  ["obstacle-outdoor", "Outdoor obstacle course", "🚧", 30],
  ["stairs", "Safe stair-walking rounds", "🪜", 10],
  ["soccer-dribble", "Soccer dribbling practice", "⚽", 20],
  ["soccer-shots", "Soccer shooting practice", "⚽", 20],
  ["basketball-dribble", "Basketball dribbling practice", "🏀", 15],
  ["basketball-shots", "Basketball shot challenge", "🏀", 20],
  ["catch", "Play catch", "🥎", 20],
  ["frisbee", "Frisbee practice", "🥏", 20],
  ["tennis-wall", "Tennis ball wall rally", "🎾", 15],
  ["badminton", "Badminton rally", "🏸", 20],
  ["hula-hoop", "Hula-hoop practice", "⭕", 15],
  ["skate", "Roller-skating practice", "🛼", 25],
  ["scooter", "Scooter ride", "🛴", 20],
  ["playground", "Active playground time", "🛝", 30],
  ["tag", "Play a game of tag", "🏷️", 20],
  ["shadow-tag", "Play shadow tag", "☀️", 15],
  ["balloon-volley", "Balloon volleyball", "🎈", 15],
  ["floor-lava", "The-floor-is-lava course", "🌋", 15],
  ["scavenger-walk", "Walking scavenger hunt", "🔎", 25],
  ["photo-walk", "Photo walk", "📷", 20],
  ["garden-movement", "Active garden helper time", "🌱", 20],
  ["water-carry", "Water-carry relay", "💧", 10],
  ["bodyweight-circuit", "Bodyweight exercise circuit", "💪", 15],
  ["squat-challenge", "Squat and reach challenge", "💪", 10],
  ["plank-games", "Plank game rounds", "💪", 10],
  ["wall-sit", "Wall-sit challenge rounds", "🧱", 5],
  ["core-circuit", "Kid-friendly core circuit", "💪", 15],
  ["balance-course", "Balance-course challenge", "⚖️", 15],
  ["one-foot", "One-foot balance games", "🦶", 10],
  ["follow-leader", "Active follow-the-leader", "👣", 20],
  ["movement-dice", "Movement-dice game", "🎲", 15],
  ["fitness-cards", "Pick five fitness cards", "🃏", 15],
  ["march-music", "March to three favorite songs", "🥁", 10],
  ["clean-song-workout", "One-song workout rounds", "🎧", 15],
  ["pillow-course", "Pillow stepping course", "🛏️", 10],
  ["backyard-laps", "Backyard lap challenge", "🏁", 15],
];

const HELPFUL_ACTIVITIES = [
  ["make-bed", "Make your bed neatly", "🛏️", 5],
  ["bedroom-floor", "Clear your bedroom floor", "🧺", 10],
  ["desk-reset", "Reset your desk or study space", "🗂️", 10],
  ["nightstand", "Tidy your nightstand", "🪄", 5],
  ["bookshelf", "Straighten one bookshelf", "📚", 10],
  ["book-sort", "Sort books by size or topic", "📚", 15],
  ["toy-basket", "Fill and organize one toy basket", "🧸", 10],
  ["toy-sort", "Sort one group of toys", "🧩", 15],
  ["closet-section", "Tidy one closet section", "👕", 15],
  ["drawer", "Organize one drawer", "🗄️", 10],
  ["outgrown-clothes", "Find clothes you have outgrown", "👚", 15],
  ["shoes-lineup", "Line up family shoes", "👟", 5],
  ["entryway", "Reset the entryway", "🚪", 10],
  ["backpacks", "Empty and organize backpacks", "🎒", 10],
  ["sports-gear", "Organize sports gear", "⚽", 15],
  ["laundry-sort", "Sort a laundry load", "🧺", 10],
  ["laundry-fold", "Fold a basket of laundry", "👕", 20],
  ["laundry-put-away", "Put away clean laundry", "🧦", 15],
  ["sock-match", "Match clean socks", "🧦", 10],
  ["towel-fold", "Fold towels", "🛁", 10],
  ["dish-collect", "Collect dishes from shared rooms", "🍽️", 5],
  ["dishwasher-unload", "Unload the dishwasher", "🍽️", 15],
  ["dishwasher-load", "Help load the dishwasher", "🍽️", 10],
  ["wipe-table", "Wipe the dining table", "🧽", 5],
  ["set-table", "Set the table for a meal", "🍴", 10],
  ["clear-table", "Clear the table after a meal", "🍽️", 10],
  ["counter-section", "Wipe one counter section", "🧽", 5],
  ["snack-shelf", "Organize the snack shelf", "🥨", 15],
  ["fridge-check", "Check the fridge for expired items with an adult", "🧊", 15],
  ["pantry-front", "Face pantry items forward", "🥫", 10],
  ["water-bottles", "Gather and wash water bottles", "💧", 15],
  ["recycling-sort", "Sort household recycling", "♻️", 10],
  ["small-trash", "Empty small trash cans", "🗑️", 10],
  ["replace-liners", "Replace trash-can liners", "🗑️", 5],
  ["mail-sort", "Sort the household mail with an adult", "✉️", 10],
  ["paper-recycle", "Collect loose paper for recycling", "📄", 10],
  ["living-pillows", "Straighten living-room pillows", "🛋️", 5],
  ["living-reset", "Reset the living room", "🛋️", 15],
  ["blanket-fold", "Fold shared-room blankets", "🧶", 10],
  ["remote-gather", "Gather remotes and game controllers", "🎮", 5],
  ["game-shelf", "Organize one game shelf", "🎲", 15],
  ["craft-supplies", "Sort craft supplies", "🎨", 20],
  ["art-display", "Refresh the family art display", "🖼️", 15],
  ["pencil-sharpen", "Sharpen and organize pencils", "✏️", 10],
  ["school-supplies", "Organize school supplies", "📓", 15],
  ["pet-water", "Refresh a pet's water with permission", "🐾", 5],
  ["pet-area", "Tidy a pet area", "🐾", 15],
  ["plant-water", "Water indoor plants", "🪴", 10],
  ["plant-check", "Check plants for dry soil", "🌱", 5],
  ["weed-small", "Weed one small garden area", "🌿", 15],
  ["porch-sweep", "Sweep the porch or steps", "🧹", 15],
  ["patio-reset", "Reset the patio seating", "☀️", 10],
  ["yard-toys", "Gather outdoor toys", "🛝", 10],
  ["sticks", "Gather fallen sticks in the yard", "🌳", 15],
  ["watering-outdoor", "Water outdoor plants", "💦", 15],
  ["car-trash", "Remove trash from the family car", "🚗", 10],
  ["car-organize", "Organize the car's back seat", "🚗", 15],
  ["windowsill", "Wipe bedroom windowsills", "🪟", 10],
  ["mirror", "Wipe one mirror", "🪞", 5],
  ["door-handles", "Wipe common door handles", "🚪", 10],
  ["baseboard", "Wipe one short baseboard section", "🧽", 10],
  ["dust-shelf", "Dust one shelf", "🪶", 10],
  ["vacuum-small", "Vacuum one small room", "🧹", 15],
  ["sweep-small", "Sweep one small floor area", "🧹", 10],
  ["kind-note", "Write a kind note for someone", "💌", 10],
  ["help-sibling", "Help a sibling with one small task", "🤝", 10],
  ["family-check", "Ask a family member how you can help", "💬", 5],
  ["tomorrow-prep", "Prepare one useful thing for tomorrow", "✅", 10],
];

const toTask = (type) => ([id, label, icon, minutes]) => ({
  id,
  label,
  icon,
  minutes,
  type,
});

export const DAILY_COACH_ACTIVITIES = [
  ...PHYSICAL_ACTIVITIES.map(toTask("physical")),
  ...HELPFUL_ACTIVITIES.map(toTask("helpful")),
];

const SUMMER_ESSENTIAL_IDS = new Set(["mt1", "mt2", "mt3", "mt4", "mt7", "bt1", "bt2"]);
const HYGIENE_LABEL = /(brush|teeth|floss|shower|bath|hair|dressed|wash face|deodorant)/i;

const hashString = (value) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const localDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isScheduledForDate = (task, date) => {
  const jsDay = date.getDay();
  const weekday = jsDay === 0 ? 7 : jsDay;
  if (Array.isArray(task.days) && task.days.length > 0) return task.days.includes(weekday);
  if (task.recurrence === "schooldays") return weekday >= 1 && weekday <= 5;
  return true;
};

const ranked = (activities, seed) => (
  [...activities].sort((a, b) => hashString(`${seed}|${a.id}`) - hashString(`${seed}|${b.id}`))
);

const buildChallengesForChild = (child, dateKey) => {
  const seed = `${dateKey}|${child.id}|daily-coach-v1`;
  const count = 3 + (hashString(seed) % 2);
  const physical = ranked(PHYSICAL_ACTIVITIES.map(toTask("physical")), `${seed}|physical`);
  const helpful = ranked(HELPFUL_ACTIVITIES.map(toTask("helpful")), `${seed}|helpful`);
  const selected = [physical[0], helpful[0]];
  const remaining = ranked(
    [...physical.slice(1), ...helpful.slice(1)],
    `${seed}|remaining`
  );

  selected.push(...remaining.slice(0, count - selected.length));

  return selected.map((activity) => ({
    ...activity,
    id: `daily-${dateKey}-${child.id}-${activity.id}`,
    category: "afternoon",
    recurrence: "daily",
    days: [],
    assignees: [child.id],
    isDailyChallenge: true,
  }));
};

export const isSummerCoachDate = (date) => date.getMonth() >= 5 && date.getMonth() <= 7;

export const getDailyCoachTasksForDate = ({ masterTasks, childrenData, date }) => {
  const scheduledTasks = (masterTasks || []).filter((task) => isScheduledForDate(task, date));
  if (!isSummerCoachDate(date)) return scheduledTasks;

  const essentials = scheduledTasks.filter(
    (task) => SUMMER_ESSENTIAL_IDS.has(task.id) || HYGIENE_LABEL.test(task.label || "")
  );
  const dateKey = localDateKey(date);
  const challenges = (childrenData || [])
    .filter((child) => child.role === "child")
    .flatMap((child) => buildChallengesForChild(child, dateKey));

  return [...essentials, ...challenges];
};
