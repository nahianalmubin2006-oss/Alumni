import type { Department } from '../types';

export type VerifiedDepartmentSeed = Pick<Department, 'name' | 'university' | 'group'> & {
  sourceUrl: string;
};

const source = {
  du: 'https://www.du.ac.bd/current_research',
  buet: 'https://brtc.buet.ac.bd/Departments?pointId=1011',
  sust: 'https://epayment.sust.edu.bd/dates/fee/registration-fee',
  ju: 'https://www.juniv.edu/public/',
  ru: 'https://www.ru.ac.bd/academic/department/',
  cu: 'https://cu.ac.bd/content/index.php?menumapno=28',
  bracu: 'https://www.bracu.ac.bd/academics/schools-and-departments',
};

const make = (
  university: string,
  group: VerifiedDepartmentSeed['group'],
  names: string[],
  sourceUrl: string
): VerifiedDepartmentSeed[] =>
  names.map((name) => ({ name, university, group, sourceUrl }));

export const VERIFIED_DEPARTMENT_SEEDS: VerifiedDepartmentSeed[] = [
  ...make('University of Dhaka', 'Arts', [
    'Bangla','English','Arabic','Persian Language and Literature','Urdu','Sanskrit',
    'Pali and Buddhist Studies','History','Philosophy','Islamic Studies','Islamic History & Culture',
    'Information Science and Library Management','Theatre and Performance Studies','Linguistics',
    'Music','World Religions and Culture','Dance'
  ], source.du),
  ...make('University of Dhaka', 'Science', [
    'Physics','Mathematics','Chemistry','Statistics','Theoretical Physics','Biomedical Physics & Technology',
    'Applied Mathematics','Theoretical and Computational Chemistry'
  ], source.du),
  ...make('University of Dhaka', 'Law', ['Law'], source.du),
  ...make('University of Dhaka', 'Business', [
    'Management','Accounting','Marketing','Finance','Banking and Insurance',
    'Management Information Systems (MIS)','International Business','Tourism and Hospitality Management',
    'Organization Strategy and Leadership'
  ], source.du),
  ...make('University of Dhaka', 'Arts', [
    'Economics','Political Science','International Relations','Sociology','Mass Communication & Journalism',
    'Public Administration','Anthropology','Population Sciences','Peace and Conflict Studies',
    'Women and Gender Studies','Development Studies','Television, Film and Photography','Criminology',
    'Communication Disorders','Printing and Publication Studies','Japanese Studies'
  ], source.du),
  ...make('University of Dhaka', 'Science', [
    'Soil, Water & Environment','Botany','Public Health','Zoology','Biochemistry and Molecular Biology',
    'Psychology','Microbiology','Fisheries','Clinical Psychology','Genetic Engineering and Biotechnology',
    'Educational and Counselling Psychology'
  ], source.du),
  ...make('University of Dhaka', 'Health', [
    'Pharmaceutical Chemistry','Clinical Pharmacy and Pharmacology','Pharmaceutical Technology','Pharmacy'
  ], source.du),
  ...make('University of Dhaka', 'Science', [
    'Geography & Environment','Geology','Oceanography','Disaster Science and Climate Resilience','Meteorology'
  ], source.du),
  ...make('University of Dhaka', 'Engineering', [
    'Electrical and Electronic Engineering','Applied Chemistry & Chemical Engineering',
    'Computer Science and Engineering','Nuclear Engineering','Robotics and Mechatronics Engineering'
  ], source.du),
  ...make('University of Dhaka', 'Arts', [
    'Drawing and Painting','Graphic Design','Printmaking','Oriental Art','Ceramic','Sculpture','Craft','Art History'
  ], source.du),

  ...make('Bangladesh University of Engineering & Technology', 'Engineering', [
    'Architecture','Biomedical Engineering','Chemical Engineering','Civil Engineering',
    'Computer Science and Engineering','Electrical and Electronic Engineering',
    'Industrial and Production Engineering','Materials and Metallurgical Engineering',
    'Mechanical Engineering','Nanomaterials and Ceramic Engineering',
    'Naval Architecture and Marine Engineering','Petroleum and Mineral Resources Engineering',
    'Urban and Regional Planning','Water Resources Engineering'
  ], source.buet),
  ...make('Bangladesh University of Engineering & Technology', 'Science', [
    'Chemistry','Mathematics','Physics'
  ], source.buet),
  ...make('Bangladesh University of Engineering & Technology', 'Arts', ['Humanities'], source.buet),

  ...make('Shahjalal University of Science & Technology', 'Science', [
    'Chemistry','Geography and Environment','Mathematics','Physics','Statistics','Oceanography'
  ], source.sust),
  ...make('Shahjalal University of Science & Technology', 'Science', [
    'Biochemistry & Molecular Biology','Genetic Engineering & Biotechnology'
  ], source.sust),
  ...make('Shahjalal University of Science & Technology', 'Agriculture', [
    'Forestry & Environmental Sciences'
  ], source.sust),
  ...make('Shahjalal University of Science & Technology', 'Engineering', [
    'Architecture','Chemical Engineering & Polymer Sciences','Civil & Environmental Engineering',
    'Computer Science & Engineering','Electrical & Electronic Engineering','Industrial & Production Engineering',
    'Mechanical Engineering','Petroleum and Mining Engineering','Software Engineering',
    'Food Engineering & Tea Technology'
  ], source.sust),
  ...make('Shahjalal University of Science & Technology', 'Business', ['Business Administration'], source.sust),
  ...make('Shahjalal University of Science & Technology', 'Arts', [
    'Anthropology','Bangla','English','Political Studies','Public Administration','Social Work','Sociology'
  ], source.sust),
  ...make('Shahjalal University of Science & Technology', 'Engineering', [
    'IICT-MIT','IICT-Software Engineering'
  ], source.sust),

  ...make('Jahangirnagar University', 'Arts', [
    'International Relations','English','History','Philosophy','Drama and Dramatics','Archaeology','Bangla',
    'Journalism and Media Studies','Fine Art'
  ], source.ju),
  ...make('Jahangirnagar University', 'Science', [
    'Computer Science and Engineering','Mathematics','Physics','Environmental Sciences',
    'Statistics and Data Science','Geological Sciences','Chemistry'
  ], source.ju),
  ...make('Jahangirnagar University', 'Arts', [
    'Economics','Urban & Regional Planning','Anthropology','Geography & Environment','Government & Politics',
    'Public Administration'
  ], source.ju),
  ...make('Jahangirnagar University', 'Science', [
    'Botany','Biochemistry & Molecular Biology','Zoology','Pharmacy','Microbiology',
    'Biotechnology & Genetic Engineering','Public Health and Informatics'
  ], source.ju),
  ...make('Jahangirnagar University', 'Business', [
    'Finance & Banking','Marketing','Accounting and Information Systems','Management Studies'
  ], source.ju),
  ...make('Jahangirnagar University', 'Law', ['Law & Justice'], source.ju),

  ...make('University of Rajshahi', 'Arts', [
    'Philosophy','History','English','Bangla','Islamic History & Culture','Arabic','Islamic Studies',
    'Theatre','Music','Persian language and literature','Sanskrit','Urdu'
  ], source.ru),
  ...make('University of Rajshahi', 'Law', ['Law','Law and Land Administration'], source.ru),
  ...make('University of Rajshahi', 'Science', [
    'Mathematics','Physics','Chemistry','Statistics and Data Science','Biochemistry & Molecular Biology',
    'Pharmacy','Population Science & Human Resource Development','Applied Mathematics',
    'Physical Education and Sports Sciences'
  ], source.ru),
  ...make('University of Rajshahi', 'Business', [
    'Accounting and Information Systems','Management Studies','Marketing','Finance','Banking and Insurance',
    'Tourism and Hospitality Management'
  ], source.ru),
  ...make('University of Rajshahi', 'Arts', [
    'Economics','Political Science','Social Work','Sociology','Mass Communication and Journalism',
    'Information Science & Library Management','Public Administration','Anthropology',
    'Folklore & Social Development studies','International Relations'
  ], source.ru),
  ...make('University of Rajshahi', 'Agriculture', ['Agronomy and Agricultural Extension','Crop Science and Technology'], source.ru),
  ...make('University of Rajshahi', 'Engineering', [
    'Applied Chemistry & Chemical Engineering','Computer Science & Engineering',
    'Information & Communication Engineering','Materials Science and Engineering',
    'Electrical and Electronic Engineering'
  ], source.ru),
  ...make('University of Rajshahi', 'Arts', [
    'Painting, Oriental Art & Printmaking','Ceramics and Sculpture','Graphic Design, Crafts and History of Art'
  ], source.ru),
  ...make('University of Rajshahi', 'Science', [
    'Psychology','Botany','Zoology','Genetic Engineering & Biotechnology','Clinical Psychology','Microbiology',
    'Geography & Environmental Studies','Geology & Mining'
  ], source.ru),
  ...make('University of Rajshahi', 'Agriculture', ['Fisheries','Veterinary & Animal Sciences'], source.ru),

  ...make('University of Chittagong', 'Arts', [
    'Arabic','Bangladesh Studies','Bengali','Dramatics','English'
  ], source.cu),
  ...make('University of Chittagong', 'Health', ['Pharmacy','Psychology'], source.cu),
  ...make('University of Chittagong', 'Science', [
    'Soil Science','Zoology','Accounting','Banking & Insurance','Finance','Human Resource Management',
    'Management','Marketing','Physical Education and Sports Science','Computer Science & Engineering',
    'Electrical and Electronic Engineering','Applied Chemistry and Chemical Engineering','Chemistry',
    'Mathematics','Physics','Statistics','Anthropology','Communication and Journalism',
    'Criminology and Police Science','Development Studies','Economics','International Relations',
    'Political Science','Public Administration','Sociology','Law','Botany','Geography and Environmental Studies',
    'Biochemistry and Molecular Biology','Microbiology','Genetic Engineering and Biotechnology','Marine Sciences',
    'Oceanography','Fisheries','Paediatrics','Community Ophthalmology'
  ], source.cu),

  ...make('BRAC University', 'Arts', [
    'Architecture','Computer Science and Engineering','Economics and Social Sciences',
    'Electrical and Electronic Engineering','English and Humanities','Mathematics & Physical Sciences',
    'Pharmacy','Biotechnology','Microbiology'
  ], source.bracu),
];

export const VERIFIED_DEPARTMENT_KEYS = new Set(
  VERIFIED_DEPARTMENT_SEEDS.map((d) => `${d.university.toLowerCase()}::${d.name.toLowerCase()}`)
);
