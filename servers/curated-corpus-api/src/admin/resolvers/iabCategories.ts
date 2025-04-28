// Auto-generated from IAB Content Taxonomy v3.0
// source: https://github.com/InteractiveAdvertisingBureau/Taxonomies/blob/main/Content%20Taxonomies/Content%20Taxonomy%203.0.tsv
export interface IABCategory {
  id: string;
  name: string;
  parentId: string | null; // Tier 1 is the "root" with parentId = null
  taxonomy: string;
}

export type IABTaxonomyDict = Record<string, Record<string, IABCategory>>;

export const IAB_CATEGORIES: IABTaxonomyDict = {
  "IAB-3.0": {
    "1": {
      "id": "1",
      "name": "Automotive",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "2": {
      "id": "2",
      "name": "Auto Body Styles",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "3": {
      "id": "3",
      "name": "Commercial Trucks",
      "parentId": "2",
      "taxonomy": "IAB-3.0"
    },
    "4": {
      "id": "4",
      "name": "Sedan",
      "parentId": "2",
      "taxonomy": "IAB-3.0"
    },
    "5": {
      "id": "5",
      "name": "Station Wagon",
      "parentId": "2",
      "taxonomy": "IAB-3.0"
    },
    "6": {
      "id": "6",
      "name": "SUV",
      "parentId": "2",
      "taxonomy": "IAB-3.0"
    },
    "7": {
      "id": "7",
      "name": "Van",
      "parentId": "2",
      "taxonomy": "IAB-3.0"
    },
    "8": {
      "id": "8",
      "name": "Convertible",
      "parentId": "2",
      "taxonomy": "IAB-3.0"
    },
    "9": {
      "id": "9",
      "name": "Coupe",
      "parentId": "2",
      "taxonomy": "IAB-3.0"
    },
    "10": {
      "id": "10",
      "name": "Crossover",
      "parentId": "2",
      "taxonomy": "IAB-3.0"
    },
    "11": {
      "id": "11",
      "name": "Hatchback",
      "parentId": "2",
      "taxonomy": "IAB-3.0"
    },
    "12": {
      "id": "12",
      "name": "Microcar",
      "parentId": "2",
      "taxonomy": "IAB-3.0"
    },
    "13": {
      "id": "13",
      "name": "Minivan",
      "parentId": "2",
      "taxonomy": "IAB-3.0"
    },
    "14": {
      "id": "14",
      "name": "Off-Road Vehicles",
      "parentId": "2",
      "taxonomy": "IAB-3.0"
    },
    "15": {
      "id": "15",
      "name": "Pickup Trucks",
      "parentId": "2",
      "taxonomy": "IAB-3.0"
    },
    "16": {
      "id": "16",
      "name": "Auto Type",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "17": {
      "id": "17",
      "name": "Budget Cars",
      "parentId": "16",
      "taxonomy": "IAB-3.0"
    },
    "18": {
      "id": "18",
      "name": "Certified Pre-Owned Cars",
      "parentId": "16",
      "taxonomy": "IAB-3.0"
    },
    "19": {
      "id": "19",
      "name": "Classic Cars",
      "parentId": "16",
      "taxonomy": "IAB-3.0"
    },
    "20": {
      "id": "20",
      "name": "Concept Cars",
      "parentId": "16",
      "taxonomy": "IAB-3.0"
    },
    "21": {
      "id": "21",
      "name": "Driverless Cars",
      "parentId": "16",
      "taxonomy": "IAB-3.0"
    },
    "22": {
      "id": "22",
      "name": "Green Vehicles",
      "parentId": "16",
      "taxonomy": "IAB-3.0"
    },
    "23": {
      "id": "23",
      "name": "Luxury Cars",
      "parentId": "16",
      "taxonomy": "IAB-3.0"
    },
    "24": {
      "id": "24",
      "name": "Performance Cars",
      "parentId": "16",
      "taxonomy": "IAB-3.0"
    },
    "25": {
      "id": "25",
      "name": "Car Culture",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "26": {
      "id": "26",
      "name": "Dash Cam Videos",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "27": {
      "id": "27",
      "name": "Motorcycles",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "28": {
      "id": "28",
      "name": "Road-Side Assistance",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "29": {
      "id": "29",
      "name": "Scooters",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "30": {
      "id": "30",
      "name": "Auto Buying and Selling",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "31": {
      "id": "31",
      "name": "Auto Insurance",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "32": {
      "id": "32",
      "name": "Auto Parts",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "33": {
      "id": "33",
      "name": "Auto Recalls",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "34": {
      "id": "34",
      "name": "Auto Repair",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "35": {
      "id": "35",
      "name": "Auto Safety",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "36": {
      "id": "36",
      "name": "Auto Shows",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "37": {
      "id": "37",
      "name": "Auto Technology",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "38": {
      "id": "38",
      "name": "Auto Infotainment Technologies",
      "parentId": "37",
      "taxonomy": "IAB-3.0"
    },
    "39": {
      "id": "39",
      "name": "Auto Navigation Systems",
      "parentId": "37",
      "taxonomy": "IAB-3.0"
    },
    "40": {
      "id": "40",
      "name": "Auto Safety Technologies",
      "parentId": "37",
      "taxonomy": "IAB-3.0"
    },
    "41": {
      "id": "41",
      "name": "Auto Rentals",
      "parentId": "1",
      "taxonomy": "IAB-3.0"
    },
    "42": {
      "id": "42",
      "name": "Books and Literature",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "43": {
      "id": "43",
      "name": "Art and Photography",
      "parentId": "42",
      "taxonomy": "IAB-3.0"
    },
    "44": {
      "id": "44",
      "name": "Biographies",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "46": {
      "id": "46",
      "name": "Comics and Graphic Novels",
      "parentId": "42",
      "taxonomy": "IAB-3.0"
    },
    "48": {
      "id": "48",
      "name": "Fiction",
      "parentId": "42",
      "taxonomy": "IAB-3.0"
    },
    "49": {
      "id": "49",
      "name": "Poetry",
      "parentId": "42",
      "taxonomy": "IAB-3.0"
    },
    "51": {
      "id": "51",
      "name": "Young Adult",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "52": {
      "id": "52",
      "name": "Business and Finance",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "53": {
      "id": "53",
      "name": "Business",
      "parentId": "52",
      "taxonomy": "IAB-3.0"
    },
    "54": {
      "id": "54",
      "name": "Business Accounting & Finance",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "55": {
      "id": "55",
      "name": "Human Resources",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "56": {
      "id": "56",
      "name": "Large Business",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "57": {
      "id": "57",
      "name": "Logistics",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "58": {
      "id": "58",
      "name": "Marketing and Advertising",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "59": {
      "id": "59",
      "name": "Sales",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "60": {
      "id": "60",
      "name": "Small and Medium-sized Business",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "61": {
      "id": "61",
      "name": "Startups",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "62": {
      "id": "62",
      "name": "Business Administration",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "63": {
      "id": "63",
      "name": "Business Banking & Finance",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "64": {
      "id": "64",
      "name": "Angel Investment",
      "parentId": "63",
      "taxonomy": "IAB-3.0"
    },
    "65": {
      "id": "65",
      "name": "Bankruptcy",
      "parentId": "63",
      "taxonomy": "IAB-3.0"
    },
    "66": {
      "id": "66",
      "name": "Business Loans",
      "parentId": "63",
      "taxonomy": "IAB-3.0"
    },
    "67": {
      "id": "67",
      "name": "Debt Factoring & Invoice Discounting",
      "parentId": "63",
      "taxonomy": "IAB-3.0"
    },
    "68": {
      "id": "68",
      "name": "Mergers and Acquisitions",
      "parentId": "63",
      "taxonomy": "IAB-3.0"
    },
    "69": {
      "id": "69",
      "name": "Private Equity",
      "parentId": "63",
      "taxonomy": "IAB-3.0"
    },
    "70": {
      "id": "70",
      "name": "Sale & Lease Back",
      "parentId": "63",
      "taxonomy": "IAB-3.0"
    },
    "71": {
      "id": "71",
      "name": "Venture Capital",
      "parentId": "63",
      "taxonomy": "IAB-3.0"
    },
    "72": {
      "id": "72",
      "name": "Business I.T.",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "73": {
      "id": "73",
      "name": "Business Operations",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "74": {
      "id": "74",
      "name": "Consumer Issues",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "75": {
      "id": "75",
      "name": "Recalls",
      "parentId": "74",
      "taxonomy": "IAB-3.0"
    },
    "76": {
      "id": "76",
      "name": "Executive Leadership & Management",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "77": {
      "id": "77",
      "name": "Government Business",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "78": {
      "id": "78",
      "name": "Green Solutions",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "79": {
      "id": "79",
      "name": "Business Utilities",
      "parentId": "53",
      "taxonomy": "IAB-3.0"
    },
    "80": {
      "id": "80",
      "name": "Economy",
      "parentId": "52",
      "taxonomy": "IAB-3.0"
    },
    "81": {
      "id": "81",
      "name": "Commodities",
      "parentId": "80",
      "taxonomy": "IAB-3.0"
    },
    "82": {
      "id": "82",
      "name": "Currencies",
      "parentId": "80",
      "taxonomy": "IAB-3.0"
    },
    "83": {
      "id": "83",
      "name": "Financial Crisis",
      "parentId": "80",
      "taxonomy": "IAB-3.0"
    },
    "84": {
      "id": "84",
      "name": "Financial Reform",
      "parentId": "80",
      "taxonomy": "IAB-3.0"
    },
    "85": {
      "id": "85",
      "name": "Financial Regulation",
      "parentId": "80",
      "taxonomy": "IAB-3.0"
    },
    "86": {
      "id": "86",
      "name": "Gasoline Prices",
      "parentId": "80",
      "taxonomy": "IAB-3.0"
    },
    "87": {
      "id": "87",
      "name": "Housing Market",
      "parentId": "80",
      "taxonomy": "IAB-3.0"
    },
    "88": {
      "id": "88",
      "name": "Interest Rates",
      "parentId": "80",
      "taxonomy": "IAB-3.0"
    },
    "89": {
      "id": "89",
      "name": "Job Market",
      "parentId": "80",
      "taxonomy": "IAB-3.0"
    },
    "90": {
      "id": "90",
      "name": "Industries",
      "parentId": "52",
      "taxonomy": "IAB-3.0"
    },
    "91": {
      "id": "91",
      "name": "Advertising Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "92": {
      "id": "92",
      "name": "Education industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "93": {
      "id": "93",
      "name": "Entertainment Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "94": {
      "id": "94",
      "name": "Environmental Services Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "95": {
      "id": "95",
      "name": "Financial Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "96": {
      "id": "96",
      "name": "Food Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "97": {
      "id": "97",
      "name": "Healthcare Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "98": {
      "id": "98",
      "name": "Hospitality Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "99": {
      "id": "99",
      "name": "Information Services Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "100": {
      "id": "100",
      "name": "Legal Services Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "101": {
      "id": "101",
      "name": "Logistics and Transportation Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "102": {
      "id": "102",
      "name": "Agriculture",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "103": {
      "id": "103",
      "name": "Management Consulting Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "104": {
      "id": "104",
      "name": "Manufacturing Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "105": {
      "id": "105",
      "name": "Mechanical and Industrial Engineering Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "106": {
      "id": "106",
      "name": "Media Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "107": {
      "id": "107",
      "name": "Metals Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "108": {
      "id": "108",
      "name": "Non-Profit Organizations",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "109": {
      "id": "109",
      "name": "Pharmaceutical Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "110": {
      "id": "110",
      "name": "Power and Energy Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "111": {
      "id": "111",
      "name": "Publishing Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "112": {
      "id": "112",
      "name": "Real Estate Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "113": {
      "id": "113",
      "name": "Apparel Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "114": {
      "id": "114",
      "name": "Retail Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "115": {
      "id": "115",
      "name": "Technology Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "116": {
      "id": "116",
      "name": "Telecommunications Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "117": {
      "id": "117",
      "name": "Automotive Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "118": {
      "id": "118",
      "name": "Aviation Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "119": {
      "id": "119",
      "name": "Biotech and Biomedical Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "120": {
      "id": "120",
      "name": "Civil Engineering Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "121": {
      "id": "121",
      "name": "Construction Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "122": {
      "id": "122",
      "name": "Defense Industry",
      "parentId": "90",
      "taxonomy": "IAB-3.0"
    },
    "123": {
      "id": "123",
      "name": "Careers",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "124": {
      "id": "124",
      "name": "Apprenticeships",
      "parentId": "123",
      "taxonomy": "IAB-3.0"
    },
    "125": {
      "id": "125",
      "name": "Career Advice",
      "parentId": "123",
      "taxonomy": "IAB-3.0"
    },
    "126": {
      "id": "126",
      "name": "Career Planning",
      "parentId": "123",
      "taxonomy": "IAB-3.0"
    },
    "127": {
      "id": "127",
      "name": "Job Search",
      "parentId": "123",
      "taxonomy": "IAB-3.0"
    },
    "128": {
      "id": "128",
      "name": "Job Fairs",
      "parentId": "127",
      "taxonomy": "IAB-3.0"
    },
    "129": {
      "id": "129",
      "name": "Resume Writing and Advice",
      "parentId": "127",
      "taxonomy": "IAB-3.0"
    },
    "130": {
      "id": "130",
      "name": "Remote Working",
      "parentId": "123",
      "taxonomy": "IAB-3.0"
    },
    "131": {
      "id": "131",
      "name": "Vocational Training",
      "parentId": "123",
      "taxonomy": "IAB-3.0"
    },
    "132": {
      "id": "132",
      "name": "Education",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "133": {
      "id": "133",
      "name": "Adult Education",
      "parentId": "132",
      "taxonomy": "IAB-3.0"
    },
    "134": {
      "id": "134",
      "name": "Private School",
      "parentId": "132",
      "taxonomy": "IAB-3.0"
    },
    "135": {
      "id": "135",
      "name": "Secondary Education",
      "parentId": "132",
      "taxonomy": "IAB-3.0"
    },
    "136": {
      "id": "136",
      "name": "Special Education",
      "parentId": "132",
      "taxonomy": "IAB-3.0"
    },
    "137": {
      "id": "137",
      "name": "College Education",
      "parentId": "132",
      "taxonomy": "IAB-3.0"
    },
    "138": {
      "id": "138",
      "name": "College Planning",
      "parentId": "137",
      "taxonomy": "IAB-3.0"
    },
    "139": {
      "id": "139",
      "name": "Postgraduate Education",
      "parentId": "137",
      "taxonomy": "IAB-3.0"
    },
    "140": {
      "id": "140",
      "name": "Professional School",
      "parentId": "139",
      "taxonomy": "IAB-3.0"
    },
    "141": {
      "id": "141",
      "name": "Undergraduate Education",
      "parentId": "137",
      "taxonomy": "IAB-3.0"
    },
    "142": {
      "id": "142",
      "name": "Early Childhood Education",
      "parentId": "132",
      "taxonomy": "IAB-3.0"
    },
    "143": {
      "id": "143",
      "name": "Educational Assessment",
      "parentId": "132",
      "taxonomy": "IAB-3.0"
    },
    "144": {
      "id": "144",
      "name": "Standardized Testing",
      "parentId": "143",
      "taxonomy": "IAB-3.0"
    },
    "145": {
      "id": "145",
      "name": "Homeschooling",
      "parentId": "132",
      "taxonomy": "IAB-3.0"
    },
    "146": {
      "id": "146",
      "name": "Homework and Study",
      "parentId": "132",
      "taxonomy": "IAB-3.0"
    },
    "147": {
      "id": "147",
      "name": "Language Learning",
      "parentId": "132",
      "taxonomy": "IAB-3.0"
    },
    "148": {
      "id": "148",
      "name": "Online Education",
      "parentId": "132",
      "taxonomy": "IAB-3.0"
    },
    "149": {
      "id": "149",
      "name": "Primary Education",
      "parentId": "132",
      "taxonomy": "IAB-3.0"
    },
    "150": {
      "id": "150",
      "name": "Attractions",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "151": {
      "id": "151",
      "name": "Amusement and Theme Parks",
      "parentId": "150",
      "taxonomy": "IAB-3.0"
    },
    "153": {
      "id": "153",
      "name": "Historic Site and Landmark Tours",
      "parentId": "150",
      "taxonomy": "IAB-3.0"
    },
    "154": {
      "id": "154",
      "name": "Malls & Shopping Centers",
      "parentId": "150",
      "taxonomy": "IAB-3.0"
    },
    "155": {
      "id": "155",
      "name": "Museums & Galleries",
      "parentId": "150",
      "taxonomy": "IAB-3.0"
    },
    "156": {
      "id": "156",
      "name": "Musicals",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "157": {
      "id": "157",
      "name": "National & Civic Holidays",
      "parentId": "1KXCLD",
      "taxonomy": "IAB-3.0"
    },
    "158": {
      "id": "158",
      "name": "Nightclubs",
      "parentId": "150",
      "taxonomy": "IAB-3.0"
    },
    "159": {
      "id": "159",
      "name": "Outdoor Attractions",
      "parentId": "150",
      "taxonomy": "IAB-3.0"
    },
    "160": {
      "id": "160",
      "name": "Parks",
      "parentId": "150",
      "taxonomy": "IAB-3.0"
    },
    "161": {
      "id": "161",
      "name": "Party Supplies and Decorations",
      "parentId": "473",
      "taxonomy": "IAB-3.0"
    },
    "162": {
      "id": "162",
      "name": "Awards Shows",
      "parentId": "8VZQHL",
      "taxonomy": "IAB-3.0"
    },
    "163": {
      "id": "163",
      "name": "Personal Celebrations & Life Events",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "164": {
      "id": "164",
      "name": "Anniversary",
      "parentId": "163",
      "taxonomy": "IAB-3.0"
    },
    "165": {
      "id": "165",
      "name": "Wedding",
      "parentId": "163",
      "taxonomy": "IAB-3.0"
    },
    "166": {
      "id": "166",
      "name": "Baby Shower",
      "parentId": "163",
      "taxonomy": "IAB-3.0"
    },
    "167": {
      "id": "167",
      "name": "Bachelor Party",
      "parentId": "163",
      "taxonomy": "IAB-3.0"
    },
    "168": {
      "id": "168",
      "name": "Bachelorette Party",
      "parentId": "163",
      "taxonomy": "IAB-3.0"
    },
    "169": {
      "id": "169",
      "name": "Birth",
      "parentId": "163",
      "taxonomy": "IAB-3.0"
    },
    "170": {
      "id": "170",
      "name": "Birthday",
      "parentId": "163",
      "taxonomy": "IAB-3.0"
    },
    "171": {
      "id": "171",
      "name": "Funeral",
      "parentId": "163",
      "taxonomy": "IAB-3.0"
    },
    "172": {
      "id": "172",
      "name": "Graduation",
      "parentId": "163",
      "taxonomy": "IAB-3.0"
    },
    "173": {
      "id": "173",
      "name": "Prom",
      "parentId": "163",
      "taxonomy": "IAB-3.0"
    },
    "177": {
      "id": "177",
      "name": "Theater Venues",
      "parentId": "150",
      "taxonomy": "IAB-3.0"
    },
    "178": {
      "id": "178",
      "name": "Zoos & Aquariums",
      "parentId": "150",
      "taxonomy": "IAB-3.0"
    },
    "179": {
      "id": "179",
      "name": "Bars & Restaurants",
      "parentId": "150",
      "taxonomy": "IAB-3.0"
    },
    "180": {
      "id": "180",
      "name": "Business Expos & Conferences",
      "parentId": "8VZQHL",
      "taxonomy": "IAB-3.0"
    },
    "181": {
      "id": "181",
      "name": "Casinos & Gambling",
      "parentId": "150",
      "taxonomy": "IAB-3.0"
    },
    "185": {
      "id": "185",
      "name": "Fan Conventions",
      "parentId": "8VZQHL",
      "taxonomy": "IAB-3.0"
    },
    "186": {
      "id": "186",
      "name": "Family and Relationships",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "187": {
      "id": "187",
      "name": "Bereavement",
      "parentId": "186",
      "taxonomy": "IAB-3.0"
    },
    "188": {
      "id": "188",
      "name": "Dating",
      "parentId": "186",
      "taxonomy": "IAB-3.0"
    },
    "189": {
      "id": "189",
      "name": "Divorce",
      "parentId": "186",
      "taxonomy": "IAB-3.0"
    },
    "190": {
      "id": "190",
      "name": "Eldercare",
      "parentId": "186",
      "taxonomy": "IAB-3.0"
    },
    "191": {
      "id": "191",
      "name": "Marriage and Civil Unions",
      "parentId": "186",
      "taxonomy": "IAB-3.0"
    },
    "192": {
      "id": "192",
      "name": "Parenting",
      "parentId": "186",
      "taxonomy": "IAB-3.0"
    },
    "193": {
      "id": "193",
      "name": "Adoption and Fostering",
      "parentId": "192",
      "taxonomy": "IAB-3.0"
    },
    "194": {
      "id": "194",
      "name": "Daycare and Pre-School",
      "parentId": "192",
      "taxonomy": "IAB-3.0"
    },
    "195": {
      "id": "195",
      "name": "Internet Safety",
      "parentId": "192",
      "taxonomy": "IAB-3.0"
    },
    "196": {
      "id": "196",
      "name": "Parenting Babies and Toddlers",
      "parentId": "192",
      "taxonomy": "IAB-3.0"
    },
    "197": {
      "id": "197",
      "name": "Parenting Children Aged 4-11",
      "parentId": "192",
      "taxonomy": "IAB-3.0"
    },
    "198": {
      "id": "198",
      "name": "Parenting Teens",
      "parentId": "192",
      "taxonomy": "IAB-3.0"
    },
    "199": {
      "id": "199",
      "name": "Special Needs Kids",
      "parentId": "192",
      "taxonomy": "IAB-3.0"
    },
    "200": {
      "id": "200",
      "name": "Single Life",
      "parentId": "186",
      "taxonomy": "IAB-3.0"
    },
    "201": {
      "id": "201",
      "name": "Fine Art",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "202": {
      "id": "202",
      "name": "Costume",
      "parentId": "201",
      "taxonomy": "IAB-3.0"
    },
    "203": {
      "id": "203",
      "name": "Dance",
      "parentId": "201",
      "taxonomy": "IAB-3.0"
    },
    "204": {
      "id": "204",
      "name": "Design",
      "parentId": "201",
      "taxonomy": "IAB-3.0"
    },
    "205": {
      "id": "205",
      "name": "Digital Arts",
      "parentId": "201",
      "taxonomy": "IAB-3.0"
    },
    "206": {
      "id": "206",
      "name": "Fine Art Photography",
      "parentId": "201",
      "taxonomy": "IAB-3.0"
    },
    "207": {
      "id": "207",
      "name": "Modern Art",
      "parentId": "201",
      "taxonomy": "IAB-3.0"
    },
    "208": {
      "id": "208",
      "name": "Opera",
      "parentId": "201",
      "taxonomy": "IAB-3.0"
    },
    "209": {
      "id": "209",
      "name": "Theater",
      "parentId": "201",
      "taxonomy": "IAB-3.0"
    },
    "210": {
      "id": "210",
      "name": "Food & Drink",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "211": {
      "id": "211",
      "name": "Alcoholic Beverages",
      "parentId": "210",
      "taxonomy": "IAB-3.0"
    },
    "212": {
      "id": "212",
      "name": "Vegan Diets",
      "parentId": "210",
      "taxonomy": "IAB-3.0"
    },
    "213": {
      "id": "213",
      "name": "Vegetarian Diets",
      "parentId": "210",
      "taxonomy": "IAB-3.0"
    },
    "214": {
      "id": "214",
      "name": "World Cuisines",
      "parentId": "210",
      "taxonomy": "IAB-3.0"
    },
    "215": {
      "id": "215",
      "name": "Barbecues and Grilling",
      "parentId": "210",
      "taxonomy": "IAB-3.0"
    },
    "216": {
      "id": "216",
      "name": "Cooking",
      "parentId": "210",
      "taxonomy": "IAB-3.0"
    },
    "217": {
      "id": "217",
      "name": "Desserts and Baking",
      "parentId": "210",
      "taxonomy": "IAB-3.0"
    },
    "218": {
      "id": "218",
      "name": "Dining Out",
      "parentId": "210",
      "taxonomy": "IAB-3.0"
    },
    "219": {
      "id": "219",
      "name": "Food Allergies",
      "parentId": "210",
      "taxonomy": "IAB-3.0"
    },
    "220": {
      "id": "220",
      "name": "Food Movements",
      "parentId": "210",
      "taxonomy": "IAB-3.0"
    },
    "221": {
      "id": "221",
      "name": "Healthy Cooking and Eating",
      "parentId": "210",
      "taxonomy": "IAB-3.0"
    },
    "222": {
      "id": "222",
      "name": "Non-Alcoholic Beverages",
      "parentId": "210",
      "taxonomy": "IAB-3.0"
    },
    "223": {
      "id": "223",
      "name": "Healthy Living",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "224": {
      "id": "224",
      "name": "Children's Health",
      "parentId": "223",
      "taxonomy": "IAB-3.0"
    },
    "225": {
      "id": "225",
      "name": "Fitness and Exercise",
      "parentId": "223",
      "taxonomy": "IAB-3.0"
    },
    "226": {
      "id": "226",
      "name": "Participant Sports",
      "parentId": "225",
      "taxonomy": "IAB-3.0"
    },
    "227": {
      "id": "227",
      "name": "Running and Jogging",
      "parentId": "225",
      "taxonomy": "IAB-3.0"
    },
    "228": {
      "id": "228",
      "name": "Men's Health",
      "parentId": "223",
      "taxonomy": "IAB-3.0"
    },
    "229": {
      "id": "229",
      "name": "Nutrition",
      "parentId": "223",
      "taxonomy": "IAB-3.0"
    },
    "230": {
      "id": "230",
      "name": "Senior Health",
      "parentId": "223",
      "taxonomy": "IAB-3.0"
    },
    "231": {
      "id": "231",
      "name": "Weight Loss",
      "parentId": "223",
      "taxonomy": "IAB-3.0"
    },
    "232": {
      "id": "232",
      "name": "Wellness",
      "parentId": "223",
      "taxonomy": "IAB-3.0"
    },
    "233": {
      "id": "233",
      "name": "Alternative Medicine",
      "parentId": "232",
      "taxonomy": "IAB-3.0"
    },
    "234": {
      "id": "234",
      "name": "Herbs and Supplements",
      "parentId": "233",
      "taxonomy": "IAB-3.0"
    },
    "235": {
      "id": "235",
      "name": "Holistic Health",
      "parentId": "233",
      "taxonomy": "IAB-3.0"
    },
    "236": {
      "id": "236",
      "name": "Physical Therapy",
      "parentId": "232",
      "taxonomy": "IAB-3.0"
    },
    "237": {
      "id": "237",
      "name": "Smoking Cessation",
      "parentId": "232",
      "taxonomy": "IAB-3.0"
    },
    "238": {
      "id": "238",
      "name": "Women's Health",
      "parentId": "223",
      "taxonomy": "IAB-3.0"
    },
    "239": {
      "id": "239",
      "name": "Hobbies & Interests",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "240": {
      "id": "240",
      "name": "Antiquing and Antiques",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "241": {
      "id": "241",
      "name": "Magic and Illusion",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "242": {
      "id": "242",
      "name": "Model Toys",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "243": {
      "id": "243",
      "name": "Musical Instruments",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "244": {
      "id": "244",
      "name": "Paranormal Phenomena",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "245": {
      "id": "245",
      "name": "Radio Control",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "246": {
      "id": "246",
      "name": "Sci-fi and Fantasy",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "247": {
      "id": "247",
      "name": "Workshops and Classes",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "248": {
      "id": "248",
      "name": "Arts and Crafts",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "249": {
      "id": "249",
      "name": "Beadwork",
      "parentId": "248",
      "taxonomy": "IAB-3.0"
    },
    "250": {
      "id": "250",
      "name": "Candle and Soap Making",
      "parentId": "248",
      "taxonomy": "IAB-3.0"
    },
    "251": {
      "id": "251",
      "name": "Drawing and Sketching",
      "parentId": "248",
      "taxonomy": "IAB-3.0"
    },
    "252": {
      "id": "252",
      "name": "Jewelry Making",
      "parentId": "248",
      "taxonomy": "IAB-3.0"
    },
    "253": {
      "id": "253",
      "name": "Needlework",
      "parentId": "248",
      "taxonomy": "IAB-3.0"
    },
    "254": {
      "id": "254",
      "name": "Painting",
      "parentId": "248",
      "taxonomy": "IAB-3.0"
    },
    "255": {
      "id": "255",
      "name": "Photography",
      "parentId": "248",
      "taxonomy": "IAB-3.0"
    },
    "256": {
      "id": "256",
      "name": "Scrapbooking",
      "parentId": "248",
      "taxonomy": "IAB-3.0"
    },
    "257": {
      "id": "257",
      "name": "Woodworking",
      "parentId": "248",
      "taxonomy": "IAB-3.0"
    },
    "258": {
      "id": "258",
      "name": "Beekeeping",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "259": {
      "id": "259",
      "name": "Birdwatching",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "260": {
      "id": "260",
      "name": "Cigars",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "261": {
      "id": "261",
      "name": "Collecting",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "262": {
      "id": "262",
      "name": "Comic Books",
      "parentId": "261",
      "taxonomy": "IAB-3.0"
    },
    "263": {
      "id": "263",
      "name": "Stamps and Coins",
      "parentId": "261",
      "taxonomy": "IAB-3.0"
    },
    "264": {
      "id": "264",
      "name": "Content Production",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "265": {
      "id": "265",
      "name": "Audio Production",
      "parentId": "264",
      "taxonomy": "IAB-3.0"
    },
    "266": {
      "id": "266",
      "name": "Freelance Writing",
      "parentId": "264",
      "taxonomy": "IAB-3.0"
    },
    "267": {
      "id": "267",
      "name": "Screenwriting",
      "parentId": "264",
      "taxonomy": "IAB-3.0"
    },
    "268": {
      "id": "268",
      "name": "Video Production",
      "parentId": "264",
      "taxonomy": "IAB-3.0"
    },
    "269": {
      "id": "269",
      "name": "Games and Puzzles",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "270": {
      "id": "270",
      "name": "Board Games and Puzzles",
      "parentId": "269",
      "taxonomy": "IAB-3.0"
    },
    "271": {
      "id": "271",
      "name": "Card Games",
      "parentId": "269",
      "taxonomy": "IAB-3.0"
    },
    "272": {
      "id": "272",
      "name": "Roleplaying Games",
      "parentId": "269",
      "taxonomy": "IAB-3.0"
    },
    "273": {
      "id": "273",
      "name": "Genealogy and Ancestry",
      "parentId": "239",
      "taxonomy": "IAB-3.0"
    },
    "274": {
      "id": "274",
      "name": "Home & Garden",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "275": {
      "id": "275",
      "name": "Gardening",
      "parentId": "274",
      "taxonomy": "IAB-3.0"
    },
    "276": {
      "id": "276",
      "name": "Remodeling & Construction",
      "parentId": "274",
      "taxonomy": "IAB-3.0"
    },
    "277": {
      "id": "277",
      "name": "Smart Home",
      "parentId": "274",
      "taxonomy": "IAB-3.0"
    },
    "278": {
      "id": "278",
      "name": "Home Appliances",
      "parentId": "274",
      "taxonomy": "IAB-3.0"
    },
    "279": {
      "id": "279",
      "name": "Home Entertaining",
      "parentId": "274",
      "taxonomy": "IAB-3.0"
    },
    "280": {
      "id": "280",
      "name": "Home Improvement",
      "parentId": "274",
      "taxonomy": "IAB-3.0"
    },
    "281": {
      "id": "281",
      "name": "Home Security",
      "parentId": "274",
      "taxonomy": "IAB-3.0"
    },
    "282": {
      "id": "282",
      "name": "Indoor Environmental Quality",
      "parentId": "274",
      "taxonomy": "IAB-3.0"
    },
    "283": {
      "id": "283",
      "name": "Interior Decorating",
      "parentId": "274",
      "taxonomy": "IAB-3.0"
    },
    "284": {
      "id": "284",
      "name": "Landscaping",
      "parentId": "274",
      "taxonomy": "IAB-3.0"
    },
    "285": {
      "id": "285",
      "name": "Outdoor Decorating",
      "parentId": "274",
      "taxonomy": "IAB-3.0"
    },
    "286": {
      "id": "286",
      "name": "Medical Health",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "287": {
      "id": "287",
      "name": "Diseases and Conditions",
      "parentId": "286",
      "taxonomy": "IAB-3.0"
    },
    "288": {
      "id": "288",
      "name": "Allergies",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "289": {
      "id": "289",
      "name": "Ear, Nose and Throat Conditions",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "290": {
      "id": "290",
      "name": "Endocrine and Metabolic Diseases",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "291": {
      "id": "291",
      "name": "Hormonal Disorders",
      "parentId": "290",
      "taxonomy": "IAB-3.0"
    },
    "292": {
      "id": "292",
      "name": "Menopause",
      "parentId": "290",
      "taxonomy": "IAB-3.0"
    },
    "293": {
      "id": "293",
      "name": "Thyroid Disorders",
      "parentId": "290",
      "taxonomy": "IAB-3.0"
    },
    "294": {
      "id": "294",
      "name": "Eye and Vision Conditions",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "295": {
      "id": "295",
      "name": "Foot Health",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "296": {
      "id": "296",
      "name": "Heart and Cardiovascular Diseases",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "297": {
      "id": "297",
      "name": "Infectious Diseases",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "298": {
      "id": "298",
      "name": "Injuries",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "299": {
      "id": "299",
      "name": "First Aid",
      "parentId": "298",
      "taxonomy": "IAB-3.0"
    },
    "300": {
      "id": "300",
      "name": "Lung and Respiratory Health",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "301": {
      "id": "301",
      "name": "Mental Health",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "302": {
      "id": "302",
      "name": "Reproductive Health",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "303": {
      "id": "303",
      "name": "Birth Control",
      "parentId": "302",
      "taxonomy": "IAB-3.0"
    },
    "304": {
      "id": "304",
      "name": "Infertility",
      "parentId": "302",
      "taxonomy": "IAB-3.0"
    },
    "305": {
      "id": "305",
      "name": "Pregnancy",
      "parentId": "302",
      "taxonomy": "IAB-3.0"
    },
    "306": {
      "id": "306",
      "name": "Blood Disorders",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "307": {
      "id": "307",
      "name": "Sexual Health",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "308": {
      "id": "308",
      "name": "Sexual Conditions",
      "parentId": "307",
      "taxonomy": "IAB-3.0"
    },
    "309": {
      "id": "309",
      "name": "Skin and Dermatology",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "310": {
      "id": "310",
      "name": "Sleep Disorders",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "311": {
      "id": "311",
      "name": "Substance Abuse",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "312": {
      "id": "312",
      "name": "Bone and Joint Conditions",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "313": {
      "id": "313",
      "name": "Brain and Nervous System Disorders",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "314": {
      "id": "314",
      "name": "Cancer",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "315": {
      "id": "315",
      "name": "Cold and Flu",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "316": {
      "id": "316",
      "name": "Dental Health",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "317": {
      "id": "317",
      "name": "Diabetes",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "318": {
      "id": "318",
      "name": "Digestive Disorders",
      "parentId": "287",
      "taxonomy": "IAB-3.0"
    },
    "319": {
      "id": "319",
      "name": "Medical Tests",
      "parentId": "286",
      "taxonomy": "IAB-3.0"
    },
    "320": {
      "id": "320",
      "name": "Pharmaceutical Drugs",
      "parentId": "286",
      "taxonomy": "IAB-3.0"
    },
    "321": {
      "id": "321",
      "name": "Surgery",
      "parentId": "286",
      "taxonomy": "IAB-3.0"
    },
    "322": {
      "id": "322",
      "name": "Vaccines",
      "parentId": "286",
      "taxonomy": "IAB-3.0"
    },
    "323": {
      "id": "323",
      "name": "Cosmetic Medical Services",
      "parentId": "286",
      "taxonomy": "IAB-3.0"
    },
    "324": {
      "id": "324",
      "name": "Movies",
      "parentId": "JLBCU7",
      "taxonomy": "IAB-3.0"
    },
    "325": {
      "id": "325",
      "name": "Action/Adventure",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "326": {
      "id": "326",
      "name": "Romance",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "331": {
      "id": "331",
      "name": "Mystery",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "332": {
      "id": "332",
      "name": "Documentary",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "335": {
      "id": "335",
      "name": "Fantasy",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "336": {
      "id": "336",
      "name": "Horror",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "338": {
      "id": "338",
      "name": "Music",
      "parentId": "JLBCU7",
      "taxonomy": "IAB-3.0"
    },
    "339": {
      "id": "339",
      "name": "Adult Contemporary Music",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "340": {
      "id": "340",
      "name": "Soft AC Music",
      "parentId": "339",
      "taxonomy": "IAB-3.0"
    },
    "341": {
      "id": "341",
      "name": "Urban AC Music",
      "parentId": "339",
      "taxonomy": "IAB-3.0"
    },
    "342": {
      "id": "342",
      "name": "Adult Album Alternative",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "343": {
      "id": "343",
      "name": "Alternative Music",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "344": {
      "id": "344",
      "name": "Children's Music",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "345": {
      "id": "345",
      "name": "Classic Hits",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "346": {
      "id": "346",
      "name": "Classical Music",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "347": {
      "id": "347",
      "name": "College Radio",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "348": {
      "id": "348",
      "name": "Comedy (Music and Audio)",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "349": {
      "id": "349",
      "name": "Contemporary Hits/Pop/Top 40",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "350": {
      "id": "350",
      "name": "Country Music",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "351": {
      "id": "351",
      "name": "Dance and Electronic Music",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "352": {
      "id": "352",
      "name": "World/International Music",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "353": {
      "id": "353",
      "name": "Songwriters/Folk",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "354": {
      "id": "354",
      "name": "Gospel Music",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "355": {
      "id": "355",
      "name": "Hip Hop Music",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "356": {
      "id": "356",
      "name": "Inspirational/New Age Music",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "357": {
      "id": "357",
      "name": "Jazz",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "358": {
      "id": "358",
      "name": "Oldies/Adult Standards",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "359": {
      "id": "359",
      "name": "Reggae",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "360": {
      "id": "360",
      "name": "Blues",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "361": {
      "id": "361",
      "name": "Religious (Music and Audio)",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "362": {
      "id": "362",
      "name": "R&B/Soul/Funk",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "363": {
      "id": "363",
      "name": "Rock Music",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "364": {
      "id": "364",
      "name": "Album-oriented Rock",
      "parentId": "363",
      "taxonomy": "IAB-3.0"
    },
    "365": {
      "id": "365",
      "name": "Alternative Rock",
      "parentId": "363",
      "taxonomy": "IAB-3.0"
    },
    "366": {
      "id": "366",
      "name": "Classic Rock",
      "parentId": "363",
      "taxonomy": "IAB-3.0"
    },
    "367": {
      "id": "367",
      "name": "Hard Rock",
      "parentId": "363",
      "taxonomy": "IAB-3.0"
    },
    "368": {
      "id": "368",
      "name": "Soft Rock",
      "parentId": "363",
      "taxonomy": "IAB-3.0"
    },
    "369": {
      "id": "369",
      "name": "Soundtracks, TV and Showtunes",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "370": {
      "id": "370",
      "name": "Sports Radio",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "371": {
      "id": "371",
      "name": "Talk Radio",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "376": {
      "id": "376",
      "name": "Public Radio",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "377": {
      "id": "377",
      "name": "Urban Contemporary Music",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "378": {
      "id": "378",
      "name": "Variety (Music and Audio)",
      "parentId": "338",
      "taxonomy": "IAB-3.0"
    },
    "380": {
      "id": "380",
      "name": "Crime",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "381": {
      "id": "381",
      "name": "Disasters",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "383": {
      "id": "383",
      "name": "Law",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "386": {
      "id": "386",
      "name": "Politics",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "387": {
      "id": "387",
      "name": "Elections",
      "parentId": "386",
      "taxonomy": "IAB-3.0"
    },
    "388": {
      "id": "388",
      "name": "Political Issues & Policy",
      "parentId": "386",
      "taxonomy": "IAB-3.0"
    },
    "389": {
      "id": "389",
      "name": "War and Conflicts",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "390": {
      "id": "390",
      "name": "Weather",
      "parentId": "464",
      "taxonomy": "IAB-3.0"
    },
    "391": {
      "id": "391",
      "name": "Personal Finance",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "392": {
      "id": "392",
      "name": "Consumer Banking",
      "parentId": "391",
      "taxonomy": "IAB-3.0"
    },
    "393": {
      "id": "393",
      "name": "Financial Assistance",
      "parentId": "391",
      "taxonomy": "IAB-3.0"
    },
    "394": {
      "id": "394",
      "name": "Government Support and Welfare",
      "parentId": "393",
      "taxonomy": "IAB-3.0"
    },
    "395": {
      "id": "395",
      "name": "Student Financial Aid",
      "parentId": "393",
      "taxonomy": "IAB-3.0"
    },
    "396": {
      "id": "396",
      "name": "Financial Planning",
      "parentId": "391",
      "taxonomy": "IAB-3.0"
    },
    "397": {
      "id": "397",
      "name": "Frugal Living",
      "parentId": "391",
      "taxonomy": "IAB-3.0"
    },
    "398": {
      "id": "398",
      "name": "Insurance",
      "parentId": "391",
      "taxonomy": "IAB-3.0"
    },
    "399": {
      "id": "399",
      "name": "Health Insurance",
      "parentId": "398",
      "taxonomy": "IAB-3.0"
    },
    "400": {
      "id": "400",
      "name": "Home Insurance",
      "parentId": "398",
      "taxonomy": "IAB-3.0"
    },
    "401": {
      "id": "401",
      "name": "Life Insurance",
      "parentId": "398",
      "taxonomy": "IAB-3.0"
    },
    "402": {
      "id": "402",
      "name": "Motor Insurance",
      "parentId": "398",
      "taxonomy": "IAB-3.0"
    },
    "403": {
      "id": "403",
      "name": "Pet Insurance",
      "parentId": "398",
      "taxonomy": "IAB-3.0"
    },
    "404": {
      "id": "404",
      "name": "Travel Insurance",
      "parentId": "398",
      "taxonomy": "IAB-3.0"
    },
    "405": {
      "id": "405",
      "name": "Personal Debt",
      "parentId": "391",
      "taxonomy": "IAB-3.0"
    },
    "406": {
      "id": "406",
      "name": "Credit Cards",
      "parentId": "405",
      "taxonomy": "IAB-3.0"
    },
    "407": {
      "id": "407",
      "name": "Home Financing",
      "parentId": "405",
      "taxonomy": "IAB-3.0"
    },
    "408": {
      "id": "408",
      "name": "Personal Loans",
      "parentId": "405",
      "taxonomy": "IAB-3.0"
    },
    "409": {
      "id": "409",
      "name": "Student Loans",
      "parentId": "405",
      "taxonomy": "IAB-3.0"
    },
    "410": {
      "id": "410",
      "name": "Personal Investing",
      "parentId": "391",
      "taxonomy": "IAB-3.0"
    },
    "411": {
      "id": "411",
      "name": "Hedge Funds",
      "parentId": "410",
      "taxonomy": "IAB-3.0"
    },
    "412": {
      "id": "412",
      "name": "Mutual Funds",
      "parentId": "410",
      "taxonomy": "IAB-3.0"
    },
    "413": {
      "id": "413",
      "name": "Options",
      "parentId": "410",
      "taxonomy": "IAB-3.0"
    },
    "414": {
      "id": "414",
      "name": "Stocks and Bonds",
      "parentId": "410",
      "taxonomy": "IAB-3.0"
    },
    "415": {
      "id": "415",
      "name": "Personal Taxes",
      "parentId": "391",
      "taxonomy": "IAB-3.0"
    },
    "416": {
      "id": "416",
      "name": "Retirement Planning",
      "parentId": "391",
      "taxonomy": "IAB-3.0"
    },
    "417": {
      "id": "417",
      "name": "Home Utilities",
      "parentId": "391",
      "taxonomy": "IAB-3.0"
    },
    "418": {
      "id": "418",
      "name": "Gas and Electric",
      "parentId": "417",
      "taxonomy": "IAB-3.0"
    },
    "419": {
      "id": "419",
      "name": "Internet Service Providers",
      "parentId": "417",
      "taxonomy": "IAB-3.0"
    },
    "420": {
      "id": "420",
      "name": "Phone Services",
      "parentId": "417",
      "taxonomy": "IAB-3.0"
    },
    "421": {
      "id": "421",
      "name": "Water Services",
      "parentId": "417",
      "taxonomy": "IAB-3.0"
    },
    "422": {
      "id": "422",
      "name": "Pets",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "423": {
      "id": "423",
      "name": "Birds",
      "parentId": "422",
      "taxonomy": "IAB-3.0"
    },
    "424": {
      "id": "424",
      "name": "Cats",
      "parentId": "422",
      "taxonomy": "IAB-3.0"
    },
    "425": {
      "id": "425",
      "name": "Dogs",
      "parentId": "422",
      "taxonomy": "IAB-3.0"
    },
    "426": {
      "id": "426",
      "name": "Fish and Aquariums",
      "parentId": "422",
      "taxonomy": "IAB-3.0"
    },
    "427": {
      "id": "427",
      "name": "Large Animals",
      "parentId": "422",
      "taxonomy": "IAB-3.0"
    },
    "428": {
      "id": "428",
      "name": "Pet Adoptions",
      "parentId": "422",
      "taxonomy": "IAB-3.0"
    },
    "429": {
      "id": "429",
      "name": "Reptiles",
      "parentId": "422",
      "taxonomy": "IAB-3.0"
    },
    "430": {
      "id": "430",
      "name": "Veterinary Medicine",
      "parentId": "422",
      "taxonomy": "IAB-3.0"
    },
    "431": {
      "id": "431",
      "name": "Pet Supplies",
      "parentId": "422",
      "taxonomy": "IAB-3.0"
    },
    "432": {
      "id": "432",
      "name": "Pop Culture",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "433": {
      "id": "433",
      "name": "Celebrity Deaths",
      "parentId": "432",
      "taxonomy": "IAB-3.0"
    },
    "434": {
      "id": "434",
      "name": "Celebrity Families",
      "parentId": "432",
      "taxonomy": "IAB-3.0"
    },
    "435": {
      "id": "435",
      "name": "Celebrity Homes",
      "parentId": "432",
      "taxonomy": "IAB-3.0"
    },
    "436": {
      "id": "436",
      "name": "Celebrity Pregnancy",
      "parentId": "432",
      "taxonomy": "IAB-3.0"
    },
    "437": {
      "id": "437",
      "name": "Celebrity Relationships",
      "parentId": "432",
      "taxonomy": "IAB-3.0"
    },
    "438": {
      "id": "438",
      "name": "Celebrity Scandal",
      "parentId": "432",
      "taxonomy": "IAB-3.0"
    },
    "439": {
      "id": "439",
      "name": "Celebrity Style",
      "parentId": "432",
      "taxonomy": "IAB-3.0"
    },
    "440": {
      "id": "440",
      "name": "Humor and Satire",
      "parentId": "432",
      "taxonomy": "IAB-3.0"
    },
    "441": {
      "id": "441",
      "name": "Real Estate",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "442": {
      "id": "442",
      "name": "Apartments",
      "parentId": "441",
      "taxonomy": "IAB-3.0"
    },
    "443": {
      "id": "443",
      "name": "Retail Property",
      "parentId": "441",
      "taxonomy": "IAB-3.0"
    },
    "444": {
      "id": "444",
      "name": "Vacation Properties",
      "parentId": "441",
      "taxonomy": "IAB-3.0"
    },
    "445": {
      "id": "445",
      "name": "Developmental Sites",
      "parentId": "441",
      "taxonomy": "IAB-3.0"
    },
    "446": {
      "id": "446",
      "name": "Hotel Properties",
      "parentId": "441",
      "taxonomy": "IAB-3.0"
    },
    "447": {
      "id": "447",
      "name": "Houses",
      "parentId": "441",
      "taxonomy": "IAB-3.0"
    },
    "448": {
      "id": "448",
      "name": "Industrial Property",
      "parentId": "441",
      "taxonomy": "IAB-3.0"
    },
    "449": {
      "id": "449",
      "name": "Land and Farms",
      "parentId": "441",
      "taxonomy": "IAB-3.0"
    },
    "450": {
      "id": "450",
      "name": "Office Property",
      "parentId": "441",
      "taxonomy": "IAB-3.0"
    },
    "451": {
      "id": "451",
      "name": "Real Estate Buying and Selling",
      "parentId": "441",
      "taxonomy": "IAB-3.0"
    },
    "452": {
      "id": "452",
      "name": "Real Estate Renting and Leasing",
      "parentId": "441",
      "taxonomy": "IAB-3.0"
    },
    "453": {
      "id": "453",
      "name": "Religion & Spirituality",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "454": {
      "id": "454",
      "name": "Agnosticism",
      "parentId": "453",
      "taxonomy": "IAB-3.0"
    },
    "455": {
      "id": "455",
      "name": "Spirituality",
      "parentId": "453",
      "taxonomy": "IAB-3.0"
    },
    "456": {
      "id": "456",
      "name": "Astrology",
      "parentId": "453",
      "taxonomy": "IAB-3.0"
    },
    "457": {
      "id": "457",
      "name": "Atheism",
      "parentId": "453",
      "taxonomy": "IAB-3.0"
    },
    "458": {
      "id": "458",
      "name": "Buddhism",
      "parentId": "453",
      "taxonomy": "IAB-3.0"
    },
    "459": {
      "id": "459",
      "name": "Christianity",
      "parentId": "453",
      "taxonomy": "IAB-3.0"
    },
    "460": {
      "id": "460",
      "name": "Hinduism",
      "parentId": "453",
      "taxonomy": "IAB-3.0"
    },
    "461": {
      "id": "461",
      "name": "Islam",
      "parentId": "453",
      "taxonomy": "IAB-3.0"
    },
    "462": {
      "id": "462",
      "name": "Judaism",
      "parentId": "453",
      "taxonomy": "IAB-3.0"
    },
    "463": {
      "id": "463",
      "name": "Sikhism",
      "parentId": "453",
      "taxonomy": "IAB-3.0"
    },
    "464": {
      "id": "464",
      "name": "Science",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "465": {
      "id": "465",
      "name": "Biological Sciences",
      "parentId": "464",
      "taxonomy": "IAB-3.0"
    },
    "466": {
      "id": "466",
      "name": "Chemistry",
      "parentId": "464",
      "taxonomy": "IAB-3.0"
    },
    "467": {
      "id": "467",
      "name": "Environment",
      "parentId": "464",
      "taxonomy": "IAB-3.0"
    },
    "468": {
      "id": "468",
      "name": "Genetics",
      "parentId": "464",
      "taxonomy": "IAB-3.0"
    },
    "469": {
      "id": "469",
      "name": "Geography",
      "parentId": "464",
      "taxonomy": "IAB-3.0"
    },
    "470": {
      "id": "470",
      "name": "Geology",
      "parentId": "464",
      "taxonomy": "IAB-3.0"
    },
    "471": {
      "id": "471",
      "name": "Physics",
      "parentId": "464",
      "taxonomy": "IAB-3.0"
    },
    "472": {
      "id": "472",
      "name": "Space and Astronomy",
      "parentId": "464",
      "taxonomy": "IAB-3.0"
    },
    "473": {
      "id": "473",
      "name": "Shopping",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "474": {
      "id": "474",
      "name": "Coupons and Discounts",
      "parentId": "473",
      "taxonomy": "IAB-3.0"
    },
    "475": {
      "id": "475",
      "name": "Flower Shopping",
      "parentId": "473",
      "taxonomy": "IAB-3.0"
    },
    "476": {
      "id": "476",
      "name": "Gifts and Greetings Cards",
      "parentId": "473",
      "taxonomy": "IAB-3.0"
    },
    "477": {
      "id": "477",
      "name": "Grocery Shopping",
      "parentId": "473",
      "taxonomy": "IAB-3.0"
    },
    "478": {
      "id": "478",
      "name": "Holiday Shopping",
      "parentId": "473",
      "taxonomy": "IAB-3.0"
    },
    "479": {
      "id": "479",
      "name": "Household Supplies",
      "parentId": "473",
      "taxonomy": "IAB-3.0"
    },
    "480": {
      "id": "480",
      "name": "Lotteries and Scratchcards",
      "parentId": "473",
      "taxonomy": "IAB-3.0"
    },
    "481": {
      "id": "481",
      "name": "Sales and Promotions",
      "parentId": "473",
      "taxonomy": "IAB-3.0"
    },
    "482": {
      "id": "482",
      "name": "Children's Games and Toys",
      "parentId": "473",
      "taxonomy": "IAB-3.0"
    },
    "483": {
      "id": "483",
      "name": "Sports",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "484": {
      "id": "484",
      "name": "American Football",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "485": {
      "id": "485",
      "name": "Boxing",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "486": {
      "id": "486",
      "name": "Cheerleading",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "487": {
      "id": "487",
      "name": "College Sports",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "488": {
      "id": "488",
      "name": "College Football",
      "parentId": "487",
      "taxonomy": "IAB-3.0"
    },
    "489": {
      "id": "489",
      "name": "College Basketball",
      "parentId": "487",
      "taxonomy": "IAB-3.0"
    },
    "490": {
      "id": "490",
      "name": "College Baseball",
      "parentId": "487",
      "taxonomy": "IAB-3.0"
    },
    "491": {
      "id": "491",
      "name": "Cricket",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "492": {
      "id": "492",
      "name": "Cycling",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "493": {
      "id": "493",
      "name": "Darts",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "494": {
      "id": "494",
      "name": "Disabled Sports",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "495": {
      "id": "495",
      "name": "Diving",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "496": {
      "id": "496",
      "name": "Equine Sports",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "497": {
      "id": "497",
      "name": "Horse Racing",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "498": {
      "id": "498",
      "name": "Extreme Sports",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "499": {
      "id": "499",
      "name": "Canoeing and Kayaking",
      "parentId": "498",
      "taxonomy": "IAB-3.0"
    },
    "500": {
      "id": "500",
      "name": "Climbing",
      "parentId": "498",
      "taxonomy": "IAB-3.0"
    },
    "501": {
      "id": "501",
      "name": "Paintball",
      "parentId": "498",
      "taxonomy": "IAB-3.0"
    },
    "502": {
      "id": "502",
      "name": "Scuba Diving",
      "parentId": "498",
      "taxonomy": "IAB-3.0"
    },
    "503": {
      "id": "503",
      "name": "Skateboarding",
      "parentId": "498",
      "taxonomy": "IAB-3.0"
    },
    "504": {
      "id": "504",
      "name": "Snowboarding",
      "parentId": "498",
      "taxonomy": "IAB-3.0"
    },
    "505": {
      "id": "505",
      "name": "Surfing and Bodyboarding",
      "parentId": "498",
      "taxonomy": "IAB-3.0"
    },
    "506": {
      "id": "506",
      "name": "Waterskiing and Wakeboarding",
      "parentId": "498",
      "taxonomy": "IAB-3.0"
    },
    "507": {
      "id": "507",
      "name": "Australian Rules Football",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "508": {
      "id": "508",
      "name": "Fantasy Sports",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "509": {
      "id": "509",
      "name": "Field Hockey",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "510": {
      "id": "510",
      "name": "Figure Skating",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "511": {
      "id": "511",
      "name": "Fishing Sports",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "512": {
      "id": "512",
      "name": "Golf",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "513": {
      "id": "513",
      "name": "Gymnastics",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "514": {
      "id": "514",
      "name": "Hunting and Shooting",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "515": {
      "id": "515",
      "name": "Ice Hockey",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "516": {
      "id": "516",
      "name": "Inline Skating",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "517": {
      "id": "517",
      "name": "Lacrosse",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "518": {
      "id": "518",
      "name": "Auto Racing",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "519": {
      "id": "519",
      "name": "Motorcycle Sports",
      "parentId": "518",
      "taxonomy": "IAB-3.0"
    },
    "520": {
      "id": "520",
      "name": "Martial Arts",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "521": {
      "id": "521",
      "name": "Olympic Sports",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "522": {
      "id": "522",
      "name": "Summer Olympic Sports",
      "parentId": "521",
      "taxonomy": "IAB-3.0"
    },
    "523": {
      "id": "523",
      "name": "Winter Olympic Sports",
      "parentId": "521",
      "taxonomy": "IAB-3.0"
    },
    "524": {
      "id": "524",
      "name": "Poker and Professional Gambling",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "525": {
      "id": "525",
      "name": "Rodeo",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "526": {
      "id": "526",
      "name": "Rowing",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "527": {
      "id": "527",
      "name": "Rugby",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "528": {
      "id": "528",
      "name": "Rugby League",
      "parentId": "527",
      "taxonomy": "IAB-3.0"
    },
    "529": {
      "id": "529",
      "name": "Rugby Union",
      "parentId": "527",
      "taxonomy": "IAB-3.0"
    },
    "530": {
      "id": "530",
      "name": "Sailing",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "531": {
      "id": "531",
      "name": "Skiing",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "532": {
      "id": "532",
      "name": "Snooker/Pool/Billiards",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "533": {
      "id": "533",
      "name": "Soccer",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "534": {
      "id": "534",
      "name": "Badminton",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "535": {
      "id": "535",
      "name": "Softball",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "536": {
      "id": "536",
      "name": "Squash",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "537": {
      "id": "537",
      "name": "Swimming",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "538": {
      "id": "538",
      "name": "Table Tennis",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "539": {
      "id": "539",
      "name": "Tennis",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "540": {
      "id": "540",
      "name": "Track and Field",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "541": {
      "id": "541",
      "name": "Volleyball",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "542": {
      "id": "542",
      "name": "Walking",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "543": {
      "id": "543",
      "name": "Water Polo",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "544": {
      "id": "544",
      "name": "Weightlifting",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "545": {
      "id": "545",
      "name": "Baseball",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "546": {
      "id": "546",
      "name": "Wrestling",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "547": {
      "id": "547",
      "name": "Basketball",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "548": {
      "id": "548",
      "name": "Beach Volleyball",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "549": {
      "id": "549",
      "name": "Bodybuilding",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "550": {
      "id": "550",
      "name": "Bowling",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "551": {
      "id": "551",
      "name": "Sports Equipment",
      "parentId": "483",
      "taxonomy": "IAB-3.0"
    },
    "552": {
      "id": "552",
      "name": "Style & Fashion",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "553": {
      "id": "553",
      "name": "Beauty",
      "parentId": "552",
      "taxonomy": "IAB-3.0"
    },
    "554": {
      "id": "554",
      "name": "Hair Care",
      "parentId": "553",
      "taxonomy": "IAB-3.0"
    },
    "555": {
      "id": "555",
      "name": "Makeup and Accessories",
      "parentId": "553",
      "taxonomy": "IAB-3.0"
    },
    "556": {
      "id": "556",
      "name": "Nail Care",
      "parentId": "553",
      "taxonomy": "IAB-3.0"
    },
    "557": {
      "id": "557",
      "name": "Natural and Organic Beauty",
      "parentId": "553",
      "taxonomy": "IAB-3.0"
    },
    "558": {
      "id": "558",
      "name": "Perfume and Fragrance",
      "parentId": "553",
      "taxonomy": "IAB-3.0"
    },
    "559": {
      "id": "559",
      "name": "Skin Care",
      "parentId": "553",
      "taxonomy": "IAB-3.0"
    },
    "560": {
      "id": "560",
      "name": "Women's Fashion",
      "parentId": "552",
      "taxonomy": "IAB-3.0"
    },
    "561": {
      "id": "561",
      "name": "Women's Accessories",
      "parentId": "560",
      "taxonomy": "IAB-3.0"
    },
    "562": {
      "id": "562",
      "name": "Women's Glasses",
      "parentId": "561",
      "taxonomy": "IAB-3.0"
    },
    "563": {
      "id": "563",
      "name": "Women's Handbags and Wallets",
      "parentId": "561",
      "taxonomy": "IAB-3.0"
    },
    "564": {
      "id": "564",
      "name": "Women's Hats and Scarves",
      "parentId": "561",
      "taxonomy": "IAB-3.0"
    },
    "565": {
      "id": "565",
      "name": "Women's Jewelry and Watches",
      "parentId": "561",
      "taxonomy": "IAB-3.0"
    },
    "566": {
      "id": "566",
      "name": "Women's Clothing",
      "parentId": "560",
      "taxonomy": "IAB-3.0"
    },
    "567": {
      "id": "567",
      "name": "Women's Business Wear",
      "parentId": "566",
      "taxonomy": "IAB-3.0"
    },
    "568": {
      "id": "568",
      "name": "Women's Casual Wear",
      "parentId": "566",
      "taxonomy": "IAB-3.0"
    },
    "569": {
      "id": "569",
      "name": "Women's Formal Wear",
      "parentId": "566",
      "taxonomy": "IAB-3.0"
    },
    "570": {
      "id": "570",
      "name": "Women's Intimates and Sleepwear",
      "parentId": "566",
      "taxonomy": "IAB-3.0"
    },
    "571": {
      "id": "571",
      "name": "Women's Outerwear",
      "parentId": "566",
      "taxonomy": "IAB-3.0"
    },
    "572": {
      "id": "572",
      "name": "Women's Sportswear",
      "parentId": "566",
      "taxonomy": "IAB-3.0"
    },
    "573": {
      "id": "573",
      "name": "Women's Shoes and Footwear",
      "parentId": "560",
      "taxonomy": "IAB-3.0"
    },
    "574": {
      "id": "574",
      "name": "Body Art",
      "parentId": "552",
      "taxonomy": "IAB-3.0"
    },
    "575": {
      "id": "575",
      "name": "Children's Clothing",
      "parentId": "552",
      "taxonomy": "IAB-3.0"
    },
    "576": {
      "id": "576",
      "name": "Designer Clothing",
      "parentId": "552",
      "taxonomy": "IAB-3.0"
    },
    "577": {
      "id": "577",
      "name": "Fashion Trends",
      "parentId": "552",
      "taxonomy": "IAB-3.0"
    },
    "578": {
      "id": "578",
      "name": "High Fashion",
      "parentId": "552",
      "taxonomy": "IAB-3.0"
    },
    "579": {
      "id": "579",
      "name": "Men's Fashion",
      "parentId": "552",
      "taxonomy": "IAB-3.0"
    },
    "580": {
      "id": "580",
      "name": "Men's Accessories",
      "parentId": "579",
      "taxonomy": "IAB-3.0"
    },
    "581": {
      "id": "581",
      "name": "Men's Jewelry and Watches",
      "parentId": "580",
      "taxonomy": "IAB-3.0"
    },
    "582": {
      "id": "582",
      "name": "Men's Clothing",
      "parentId": "579",
      "taxonomy": "IAB-3.0"
    },
    "583": {
      "id": "583",
      "name": "Men's Business Wear",
      "parentId": "582",
      "taxonomy": "IAB-3.0"
    },
    "584": {
      "id": "584",
      "name": "Men's Casual Wear",
      "parentId": "582",
      "taxonomy": "IAB-3.0"
    },
    "585": {
      "id": "585",
      "name": "Men's Formal Wear",
      "parentId": "582",
      "taxonomy": "IAB-3.0"
    },
    "586": {
      "id": "586",
      "name": "Men's Outerwear",
      "parentId": "582",
      "taxonomy": "IAB-3.0"
    },
    "587": {
      "id": "587",
      "name": "Men's Sportswear",
      "parentId": "582",
      "taxonomy": "IAB-3.0"
    },
    "588": {
      "id": "588",
      "name": "Men's Underwear and Sleepwear",
      "parentId": "582",
      "taxonomy": "IAB-3.0"
    },
    "589": {
      "id": "589",
      "name": "Men's Shoes and Footwear",
      "parentId": "579",
      "taxonomy": "IAB-3.0"
    },
    "590": {
      "id": "590",
      "name": "Personal Care",
      "parentId": "552",
      "taxonomy": "IAB-3.0"
    },
    "591": {
      "id": "591",
      "name": "Bath and Shower",
      "parentId": "590",
      "taxonomy": "IAB-3.0"
    },
    "592": {
      "id": "592",
      "name": "Deodorant and Antiperspirant",
      "parentId": "590",
      "taxonomy": "IAB-3.0"
    },
    "593": {
      "id": "593",
      "name": "Oral care",
      "parentId": "590",
      "taxonomy": "IAB-3.0"
    },
    "594": {
      "id": "594",
      "name": "Shaving",
      "parentId": "590",
      "taxonomy": "IAB-3.0"
    },
    "595": {
      "id": "595",
      "name": "Street Style",
      "parentId": "552",
      "taxonomy": "IAB-3.0"
    },
    "596": {
      "id": "596",
      "name": "Technology & Computing",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "597": {
      "id": "597",
      "name": "Artificial Intelligence",
      "parentId": "596",
      "taxonomy": "IAB-3.0"
    },
    "598": {
      "id": "598",
      "name": "Augmented Reality",
      "parentId": "596",
      "taxonomy": "IAB-3.0"
    },
    "599": {
      "id": "599",
      "name": "Computing",
      "parentId": "596",
      "taxonomy": "IAB-3.0"
    },
    "600": {
      "id": "600",
      "name": "Computer Networking",
      "parentId": "599",
      "taxonomy": "IAB-3.0"
    },
    "601": {
      "id": "601",
      "name": "Computer Peripherals",
      "parentId": "599",
      "taxonomy": "IAB-3.0"
    },
    "602": {
      "id": "602",
      "name": "Software and Applications",
      "parentId": "599",
      "taxonomy": "IAB-3.0"
    },
    "603": {
      "id": "603",
      "name": "3-D Graphics",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "604": {
      "id": "604",
      "name": "Photo Editing Software",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "605": {
      "id": "605",
      "name": "Shareware and Freeware",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "606": {
      "id": "606",
      "name": "Video Software",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "607": {
      "id": "607",
      "name": "Web Conferencing",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "608": {
      "id": "608",
      "name": "Antivirus Software",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "609": {
      "id": "609",
      "name": "Browsers",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "610": {
      "id": "610",
      "name": "Computer Animation",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "611": {
      "id": "611",
      "name": "Databases",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "612": {
      "id": "612",
      "name": "Desktop Publishing",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "613": {
      "id": "613",
      "name": "Digital Audio",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "614": {
      "id": "614",
      "name": "Graphics Software",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "615": {
      "id": "615",
      "name": "Operating Systems",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "616": {
      "id": "616",
      "name": "Data Storage and Warehousing",
      "parentId": "599",
      "taxonomy": "IAB-3.0"
    },
    "617": {
      "id": "617",
      "name": "Desktops",
      "parentId": "599",
      "taxonomy": "IAB-3.0"
    },
    "618": {
      "id": "618",
      "name": "Information and Network Security",
      "parentId": "599",
      "taxonomy": "IAB-3.0"
    },
    "619": {
      "id": "619",
      "name": "Internet",
      "parentId": "599",
      "taxonomy": "IAB-3.0"
    },
    "620": {
      "id": "620",
      "name": "Cloud Computing",
      "parentId": "619",
      "taxonomy": "IAB-3.0"
    },
    "621": {
      "id": "621",
      "name": "Web Development",
      "parentId": "619",
      "taxonomy": "IAB-3.0"
    },
    "622": {
      "id": "622",
      "name": "Web Hosting",
      "parentId": "619",
      "taxonomy": "IAB-3.0"
    },
    "623": {
      "id": "623",
      "name": "Email",
      "parentId": "619",
      "taxonomy": "IAB-3.0"
    },
    "624": {
      "id": "624",
      "name": "Internet for Beginners",
      "parentId": "619",
      "taxonomy": "IAB-3.0"
    },
    "625": {
      "id": "625",
      "name": "Internet of Things",
      "parentId": "619",
      "taxonomy": "IAB-3.0"
    },
    "626": {
      "id": "626",
      "name": "IT and Internet Support",
      "parentId": "619",
      "taxonomy": "IAB-3.0"
    },
    "627": {
      "id": "627",
      "name": "Search",
      "parentId": "619",
      "taxonomy": "IAB-3.0"
    },
    "628": {
      "id": "628",
      "name": "Social Networking",
      "parentId": "619",
      "taxonomy": "IAB-3.0"
    },
    "629": {
      "id": "629",
      "name": "Web Design and HTML",
      "parentId": "619",
      "taxonomy": "IAB-3.0"
    },
    "630": {
      "id": "630",
      "name": "Laptops",
      "parentId": "599",
      "taxonomy": "IAB-3.0"
    },
    "631": {
      "id": "631",
      "name": "Programming Languages",
      "parentId": "599",
      "taxonomy": "IAB-3.0"
    },
    "632": {
      "id": "632",
      "name": "Consumer Electronics",
      "parentId": "596",
      "taxonomy": "IAB-3.0"
    },
    "633": {
      "id": "633",
      "name": "Cameras and Camcorders",
      "parentId": "632",
      "taxonomy": "IAB-3.0"
    },
    "634": {
      "id": "634",
      "name": "Home Entertainment Systems",
      "parentId": "632",
      "taxonomy": "IAB-3.0"
    },
    "635": {
      "id": "635",
      "name": "Smartphones",
      "parentId": "632",
      "taxonomy": "IAB-3.0"
    },
    "636": {
      "id": "636",
      "name": "Tablets and E-readers",
      "parentId": "632",
      "taxonomy": "IAB-3.0"
    },
    "637": {
      "id": "637",
      "name": "Wearable Technology",
      "parentId": "632",
      "taxonomy": "IAB-3.0"
    },
    "638": {
      "id": "638",
      "name": "Robotics",
      "parentId": "596",
      "taxonomy": "IAB-3.0"
    },
    "639": {
      "id": "639",
      "name": "Virtual Reality",
      "parentId": "596",
      "taxonomy": "IAB-3.0"
    },
    "640": {
      "id": "640",
      "name": "Television",
      "parentId": "JLBCU7",
      "taxonomy": "IAB-3.0"
    },
    "641": {
      "id": "641",
      "name": "Animation & Anime",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "642": {
      "id": "642",
      "name": "Soap Opera",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "643": {
      "id": "643",
      "name": "Special Interest (Indie/Art House)",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "645": {
      "id": "645",
      "name": "Family/Children",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "646": {
      "id": "646",
      "name": "Comedy",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "647": {
      "id": "647",
      "name": "Drama",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "648": {
      "id": "648",
      "name": "Factual",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "649": {
      "id": "649",
      "name": "Holiday",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "650": {
      "id": "650",
      "name": "Music Video",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "651": {
      "id": "651",
      "name": "Reality TV",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "652": {
      "id": "652",
      "name": "Science Fiction",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "653": {
      "id": "653",
      "name": "Travel",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "654": {
      "id": "654",
      "name": "Travel Accessories",
      "parentId": "653",
      "taxonomy": "IAB-3.0"
    },
    "655": {
      "id": "655",
      "name": "Travel Locations",
      "parentId": "653",
      "taxonomy": "IAB-3.0"
    },
    "656": {
      "id": "656",
      "name": "Africa Travel",
      "parentId": "655",
      "taxonomy": "IAB-3.0"
    },
    "657": {
      "id": "657",
      "name": "Asia Travel",
      "parentId": "655",
      "taxonomy": "IAB-3.0"
    },
    "658": {
      "id": "658",
      "name": "Australia and Oceania Travel",
      "parentId": "655",
      "taxonomy": "IAB-3.0"
    },
    "659": {
      "id": "659",
      "name": "Europe Travel",
      "parentId": "655",
      "taxonomy": "IAB-3.0"
    },
    "660": {
      "id": "660",
      "name": "North America Travel",
      "parentId": "655",
      "taxonomy": "IAB-3.0"
    },
    "661": {
      "id": "661",
      "name": "Polar Travel",
      "parentId": "655",
      "taxonomy": "IAB-3.0"
    },
    "662": {
      "id": "662",
      "name": "South America Travel",
      "parentId": "655",
      "taxonomy": "IAB-3.0"
    },
    "663": {
      "id": "663",
      "name": "Travel Preparation and Advice",
      "parentId": "653",
      "taxonomy": "IAB-3.0"
    },
    "664": {
      "id": "664",
      "name": "Travel Type",
      "parentId": "653",
      "taxonomy": "IAB-3.0"
    },
    "665": {
      "id": "665",
      "name": "Adventure Travel",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "666": {
      "id": "666",
      "name": "Family Travel",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "667": {
      "id": "667",
      "name": "Honeymoons and Getaways",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "668": {
      "id": "668",
      "name": "Hotels and Motels",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "669": {
      "id": "669",
      "name": "Rail Travel",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "670": {
      "id": "670",
      "name": "Road Trips",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "671": {
      "id": "671",
      "name": "Spas",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "672": {
      "id": "672",
      "name": "Air Travel",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "673": {
      "id": "673",
      "name": "Beach Travel",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "674": {
      "id": "674",
      "name": "Bed & Breakfasts",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "675": {
      "id": "675",
      "name": "Budget Travel",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "676": {
      "id": "676",
      "name": "Business Travel",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "677": {
      "id": "677",
      "name": "Camping",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "678": {
      "id": "678",
      "name": "Cruises",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "679": {
      "id": "679",
      "name": "Day Trips",
      "parentId": "664",
      "taxonomy": "IAB-3.0"
    },
    "680": {
      "id": "680",
      "name": "Video Gaming",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "681": {
      "id": "681",
      "name": "Console Games",
      "parentId": "680",
      "taxonomy": "IAB-3.0"
    },
    "682": {
      "id": "682",
      "name": "eSports",
      "parentId": "680",
      "taxonomy": "IAB-3.0"
    },
    "683": {
      "id": "683",
      "name": "Mobile Games",
      "parentId": "680",
      "taxonomy": "IAB-3.0"
    },
    "684": {
      "id": "684",
      "name": "PC Games",
      "parentId": "680",
      "taxonomy": "IAB-3.0"
    },
    "685": {
      "id": "685",
      "name": "Video Game Genres",
      "parentId": "680",
      "taxonomy": "IAB-3.0"
    },
    "686": {
      "id": "686",
      "name": "Action Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "687": {
      "id": "687",
      "name": "Role-Playing Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "688": {
      "id": "688",
      "name": "Simulation Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "689": {
      "id": "689",
      "name": "Sports Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "690": {
      "id": "690",
      "name": "Strategy Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "691": {
      "id": "691",
      "name": "Action-Adventure Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "692": {
      "id": "692",
      "name": "Adventure Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "693": {
      "id": "693",
      "name": "Casual Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "694": {
      "id": "694",
      "name": "Educational Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "695": {
      "id": "695",
      "name": "Exercise and Fitness Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "696": {
      "id": "696",
      "name": "MMOs",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "697": {
      "id": "697",
      "name": "Music and Party Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "698": {
      "id": "698",
      "name": "Puzzle Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "80DV8O": {
      "id": "80DV8O",
      "name": "Communication",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "JLBCU7": {
      "id": "JLBCU7",
      "name": "Entertainment",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "8VZQHL": {
      "id": "8VZQHL",
      "name": "Events",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "SPSHQ5": {
      "id": "SPSHQ5",
      "name": "Genres",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "VKIV56": {
      "id": "VKIV56",
      "name": "Nature",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "EZWB7V": {
      "id": "EZWB7V",
      "name": "History",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "TIFQA5": {
      "id": "TIFQA5",
      "name": "Lifestyle",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "A0AH3G": {
      "id": "A0AH3G",
      "name": "Talk Show",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "KHPC5A": {
      "id": "KHPC5A",
      "name": "True Crime",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "KHPC6A": {
      "id": "KHPC6A",
      "name": "Western",
      "parentId": "SPSHQ5",
      "taxonomy": "IAB-3.0"
    },
    "1KXCLD": {
      "id": "1KXCLD",
      "name": "Holidays",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "WQC6HR": {
      "id": "WQC6HR",
      "name": "Maps & Navigation",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "8YPBBL": {
      "id": "8YPBBL",
      "name": "Civic affairs",
      "parentId": "386",
      "taxonomy": "IAB-3.0"
    },
    "W3CW2J": {
      "id": "W3CW2J",
      "name": "Productivity",
      "parentId": "602",
      "taxonomy": "IAB-3.0"
    },
    "v9i3On": {
      "id": "v9i3On",
      "name": "Sensitive Topics",
      "parentId": null,
      "taxonomy": "IAB-3.0"
    },
    "Rm3SiT": {
      "id": "Rm3SiT",
      "name": "Adult & Explicit Sexual Content",
      "parentId": "v9i3On",
      "taxonomy": "IAB-3.0"
    },
    "avbNf2": {
      "id": "avbNf2",
      "name": "Arms & Ammunition",
      "parentId": "v9i3On",
      "taxonomy": "IAB-3.0"
    },
    "XtODT3": {
      "id": "XtODT3",
      "name": "Crime & Harmful Acts to Individuals, Society & Human Right Violations",
      "parentId": "v9i3On",
      "taxonomy": "IAB-3.0"
    },
    "I4GWl6": {
      "id": "I4GWl6",
      "name": "Death, Injury, or Military Conflict",
      "parentId": "v9i3On",
      "taxonomy": "IAB-3.0"
    },
    "Z7rJBM": {
      "id": "Z7rJBM",
      "name": "Debated Sensitive Social Issues",
      "parentId": "v9i3On",
      "taxonomy": "IAB-3.0"
    },
    "HxqYV1": {
      "id": "HxqYV1",
      "name": "Hate Speech and Acts of Aggression",
      "parentId": "v9i3On",
      "taxonomy": "IAB-3.0"
    },
    "pg0WhF": {
      "id": "pg0WhF",
      "name": "Illegal Drugs, Tobacco, eCigarettes, Vaping, Alcohol",
      "parentId": "v9i3On",
      "taxonomy": "IAB-3.0"
    },
    "j9PaO9": {
      "id": "j9PaO9",
      "name": "Obscenity and Profanity",
      "parentId": "v9i3On",
      "taxonomy": "IAB-3.0"
    },
    "mm3UXx": {
      "id": "mm3UXx",
      "name": "Online Piracy",
      "parentId": "v9i3On",
      "taxonomy": "IAB-3.0"
    },
    "6i4dB6": {
      "id": "6i4dB6",
      "name": "Spam or Harmful Content",
      "parentId": "v9i3On",
      "taxonomy": "IAB-3.0"
    },
    "8FD8nI": {
      "id": "8FD8nI",
      "name": "Terrorism",
      "parentId": "v9i3On",
      "taxonomy": "IAB-3.0"
    },
    "MQ2XML": {
      "id": "MQ2XML",
      "name": "Adult Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "ZJG29S": {
      "id": "ZJG29S",
      "name": "Casino and Gambling Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "VWGKS7": {
      "id": "VWGKS7",
      "name": "Family Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "II436J": {
      "id": "II436J",
      "name": "Horror Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    },
    "VK7KD0": {
      "id": "VK7KD0",
      "name": "Racing Video Games",
      "parentId": "685",
      "taxonomy": "IAB-3.0"
    }
  }
};