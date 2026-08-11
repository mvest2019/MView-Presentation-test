/**
 * The 254 Texas counties, alphabetical.
 *
 * Taken verbatim from the Know Your Operators prototype (`v46` county
 * directory script), which uses one list for both the "Browse operators by
 * county" grid and the directory's County select. Kept as one export here for
 * the same reason — two lists would drift.
 *
 * Ordering is the prototype's, which is the Census/RRC alphabetisation:
 * "DeWitt" before "Deaf Smith" and "La Salle" under L. Do not re-sort with
 * `localeCompare`; it moves both and the A–Z filter stops matching.
 */

export const TEXAS_COUNTIES: readonly string[] = [
  "Anderson", "Andrews", "Angelina", "Aransas", "Archer", "Armstrong",
  "Atascosa", "Austin", "Bailey", "Bandera", "Bastrop", "Baylor", "Bee",
  "Bell", "Bexar", "Blanco", "Borden", "Bosque", "Bowie", "Brazoria",
  "Brazos", "Brewster", "Briscoe", "Brooks", "Brown", "Burleson", "Burnet",
  "Caldwell", "Calhoun", "Callahan", "Cameron", "Camp", "Carson", "Cass",
  "Castro", "Chambers", "Cherokee", "Childress", "Clay", "Cochran", "Coke",
  "Coleman", "Collin", "Collingsworth", "Colorado", "Comal", "Comanche",
  "Concho", "Cooke", "Coryell", "Cottle", "Crane", "Crockett", "Crosby",
  "Culberson", "Dallam", "Dallas", "Dawson", "DeWitt", "Deaf Smith", "Delta",
  "Denton", "Dickens", "Dimmit", "Donley", "Duval", "Eastland", "Ector",
  "Edwards", "El Paso", "Ellis", "Erath", "Falls", "Fannin", "Fayette",
  "Fisher", "Floyd", "Foard", "Fort Bend", "Franklin", "Freestone", "Frio",
  "Gaines", "Galveston", "Garza", "Gillespie", "Glasscock", "Goliad",
  "Gonzales", "Gray", "Grayson", "Gregg", "Grimes", "Guadalupe", "Hale",
  "Hall", "Hamilton", "Hansford", "Hardeman", "Hardin", "Harris", "Harrison",
  "Hartley", "Haskell", "Hays", "Hemphill", "Henderson", "Hidalgo", "Hill",
  "Hockley", "Hood", "Hopkins", "Houston", "Howard", "Hudspeth", "Hunt",
  "Hutchinson", "Irion", "Jack", "Jackson", "Jasper", "Jeff Davis",
  "Jefferson", "Jim Hogg", "Jim Wells", "Johnson", "Jones", "Karnes",
  "Kaufman", "Kendall", "Kenedy", "Kent", "Kerr", "Kimble", "King", "Kinney",
  "Kleberg", "Knox", "La Salle", "Lamar", "Lamb", "Lampasas", "Lavaca", "Lee",
  "Leon", "Liberty", "Limestone", "Lipscomb", "Live Oak", "Llano", "Loving",
  "Lubbock", "Lynn", "Madison", "Marion", "Martin", "Mason", "Matagorda",
  "Maverick", "McCulloch", "McLennan", "McMullen", "Medina", "Menard",
  "Midland", "Milam", "Mills", "Mitchell", "Montague", "Montgomery", "Moore",
  "Morris", "Motley", "Nacogdoches", "Navarro", "Newton", "Nolan", "Nueces",
  "Ochiltree", "Oldham", "Orange", "Palo Pinto", "Panola", "Parker", "Parmer",
  "Pecos", "Polk", "Potter", "Presidio", "Rains", "Randall", "Reagan", "Real",
  "Red River", "Reeves", "Refugio", "Roberts", "Robertson", "Rockwall",
  "Runnels", "Rusk", "Sabine", "San Augustine", "San Jacinto", "San Patricio",
  "San Saba", "Schleicher", "Scurry", "Shackelford", "Shelby", "Sherman",
  "Smith", "Somervell", "Starr", "Stephens", "Sterling", "Stonewall",
  "Sutton", "Swisher", "Tarrant", "Taylor", "Terrell", "Terry",
  "Throckmorton", "Titus", "Tom Green", "Travis", "Trinity", "Tyler",
  "Upshur", "Upton", "Uvalde", "Val Verde", "Van Zandt", "Victoria", "Walker",
  "Waller", "Ward", "Washington", "Webb", "Wharton", "Wheeler", "Wichita",
  "Wilbarger", "Willacy", "Williamson", "Wilson", "Winkler", "Wise", "Wood",
  "Yoakum", "Young", "Zapata", "Zavala",
];

/** `A`–`Z`, prefixed with the "all counties" option the A–Z filter opens on. */
export const COUNTY_LETTERS: readonly string[] = [
  "ALL",
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""),
];

/** Letters that actually start a county name, so the rest can be disabled. */
export const COUNTY_LETTERS_PRESENT: ReadonlySet<string> = new Set(
  TEXAS_COUNTIES.map((county) => county[0].toUpperCase()),
);
