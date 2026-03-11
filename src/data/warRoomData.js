export const sections = [
  { id: "biochem", name: "Biochemistry", start: 52, end: 113, color: "#14b8a6", icon: "🧬", pathoma: null, kind: "principles" },
  { id: "immuno", name: "Immunology", start: 114, end: 141, color: "#10b981", icon: "🛡️", pathoma: "Ch 1", kind: "principles" },
  { id: "micro", name: "Microbiology", start: 142, end: 221, color: "#84cc16", icon: "🦠", pathoma: null, kind: "principles" },
  { id: "path", name: "Pathology", start: 222, end: 247, color: "#e11d48", icon: "🔍", pathoma: "Ch 1-5", kind: "principles" },
  { id: "pharm", name: "Pharmacology", start: 248, end: 275, color: "#6366f1", icon: "💊", pathoma: null, kind: "principles" },
  { id: "pubhealth", name: "Pub Health / Biostats", start: 276, end: 299, color: "#a855f7", icon: "📊", pathoma: null, kind: "principles" },
  { id: "cardio", name: "Cardiovascular", start: 304, end: 349, color: "#ef4444", icon: "♥", pathoma: "Ch 8", kind: "systems" },
  { id: "endo", name: "Endocrine", start: 350, end: 383, color: "#f97316", icon: "⚙️", pathoma: "Ch 16", kind: "systems" },
  { id: "gi", name: "Gastrointestinal", start: 384, end: 429, color: "#f59e0b", icon: "⚡", pathoma: "Ch 9-10", kind: "systems" },
  { id: "heme", name: "Heme / Onc", start: 430, end: 469, color: "#dc2626", icon: "🩸", pathoma: "Ch 6-7,11", kind: "systems" },
  { id: "msk", name: "MSK / Skin / CT", start: 470, end: 519, color: "#d4d4d4", icon: "🦴", pathoma: "Ch 17-18", kind: "systems" },
  { id: "neuro", name: "Neurology", start: 520, end: 589, color: "#8b5cf6", icon: "🧠", pathoma: "Ch 19-20", kind: "systems" },
  { id: "psych", name: "Psychiatry", start: 590, end: 615, color: "#ec4899", icon: "🧘", pathoma: null, kind: "systems" },
  { id: "renal", name: "Renal", start: 616, end: 649, color: "#06b6d4", icon: "💧", pathoma: "Ch 14-15", kind: "systems" },
  { id: "repro", name: "Reproductive", start: 650, end: 697, color: "#f472b6", icon: "🔬", pathoma: "Ch 12-13", kind: "systems" },
  { id: "resp", name: "Respiratory", start: 698, end: 727, color: "#3b82f6", icon: "🫁", pathoma: "Ch 8", kind: "systems" }
];

export const topics = [
  { title: "DNA replication & repair", fa: "52-56", sectionId: "biochem", pathoma: null, sketchy: null, bnb: "Biochem: DNA", anking: "Biochemistry::DNA_Replication", keywords: ["helicase", "primase", "polymerase", "Okazaki", "xeroderma", "mismatch repair", "BRCA", "Lynch"] },
  { title: "Transcription & translation", fa: "56-60", sectionId: "biochem", pathoma: null, sketchy: null, bnb: "Biochem: Transcription", anking: "Biochemistry::Transcription", keywords: ["RNA polymerase", "splicing", "ribosome", "tRNA", "post-translational", "ubiquitin"] },
  { title: "Cell cycle & tumor suppressors", fa: "60-61", sectionId: "biochem", pathoma: "Ch 3", sketchy: null, bnb: "Biochem: Cell Cycle", anking: "Biochemistry::Cell_Cycle", keywords: ["CDK", "cyclin", "p53", "Rb", "checkpoint", "apoptosis", "proto-oncogene"] },
  { title: "Genetic disorders & inheritance", fa: "62-70", sectionId: "biochem", pathoma: null, sketchy: null, bnb: "Biochem: Genetics", anking: "Biochemistry::Genetics", keywords: ["autosomal dominant", "recessive", "X-linked", "Hardy-Weinberg", "Down", "Turner", "Klinefelter", "trinucleotide", "Huntington", "fragile X"] },
  { title: "Collagen & CT disorders", fa: "73-74", sectionId: "biochem", pathoma: null, sketchy: null, bnb: "Biochem: Collagen", anking: "Biochemistry::Collagen", keywords: ["osteogenesis imperfecta", "Ehlers-Danlos", "Marfan", "scurvy", "type I", "type III"] },
  { title: "Glycolysis & gluconeogenesis", fa: "78-80", sectionId: "biochem", pathoma: null, sketchy: null, bnb: "Biochem: Glycolysis", anking: "Biochemistry::Glycolysis", keywords: ["hexokinase", "PFK-1", "pyruvate kinase", "PEPCK", "Cori cycle", "fructose-1,6-bisphosphatase"] },
  { title: "TCA cycle & ETC", fa: "80-82", sectionId: "biochem", pathoma: null, sketchy: null, bnb: "Biochem: TCA/ETC", anking: "Biochemistry::TCA", keywords: ["citrate synthase", "isocitrate dehydrogenase", "alpha-ketoglutarate", "ATP synthase", "cyanide", "uncoupling"] },
  { title: "Glycogen & lysosomal storage diseases", fa: "84-87", sectionId: "biochem", pathoma: null, sketchy: null, bnb: "Biochem: Storage Diseases", anking: "Biochemistry::Glycogen_Storage", keywords: ["Von Gierke", "Pompe", "McArdle", "Tay-Sachs", "Gaucher", "Niemann-Pick", "Fabry", "Krabbe", "Hunter", "Hurler"] },
  { title: "Fatty acid metabolism & ketones", fa: "88-90", sectionId: "biochem", pathoma: null, sketchy: null, bnb: "Biochem: Fatty Acids", anking: "Biochemistry::Fatty_Acid", keywords: ["beta-oxidation", "carnitine", "MCAD", "ketone bodies", "CPT-I", "malonyl-CoA"] },
  { title: "Amino acid disorders", fa: "91-95", sectionId: "biochem", pathoma: null, sketchy: null, bnb: "Biochem: Amino Acids", anking: "Biochemistry::Amino_Acids", keywords: ["PKU", "maple syrup urine", "homocystinuria", "alkaptonuria", "cystinuria", "phenylalanine"] },
  { title: "Vitamins (fat & water soluble)", fa: "96-103", sectionId: "biochem", pathoma: null, sketchy: null, bnb: "Biochem: Vitamins", anking: "Biochemistry::Vitamins", keywords: ["thiamine", "niacin", "B6", "B12", "folate", "vitamin A", "vitamin D", "vitamin E", "vitamin K", "beriberi", "pellagra", "scurvy"] },
  { title: "Innate vs adaptive immunity", fa: "114-116", sectionId: "immuno", pathoma: null, sketchy: null, bnb: "Immuno: Overview", anking: "Immunology::Innate_vs_Adaptive", keywords: ["innate", "adaptive", "toll-like receptor", "complement", "NK cell", "macrophage"] },
  { title: "MHC I & II / antigen presentation", fa: "117-118", sectionId: "immuno", pathoma: null, sketchy: null, bnb: "Immuno: MHC", anking: "Immunology::MHC", keywords: ["HLA", "CD8", "CD4", "class I", "class II", "endogenous", "exogenous", "cross-presentation"] },
  { title: "T cells, B cells & antibodies", fa: "118-123", sectionId: "immuno", pathoma: null, sketchy: null, bnb: "Immuno: Lymphocytes", anking: "Immunology::T_Cells", keywords: ["helper T", "cytotoxic", "Treg", "IgG", "IgM", "IgA", "IgE", "isotype switching", "plasma cell"] },
  { title: "Complement system", fa: "124-125", sectionId: "immuno", pathoma: null, sketchy: null, bnb: "Immuno: Complement", anking: "Immunology::Complement", keywords: ["classical", "alternative", "lectin", "C3", "C5", "MAC", "C1 esterase inhibitor", "hereditary angioedema"] },
  { title: "Hypersensitivity reactions", fa: "126-128", sectionId: "immuno", pathoma: null, sketchy: null, bnb: "Immuno: Hypersensitivity", anking: "Immunology::Hypersensitivity", keywords: ["type I anaphylaxis", "type II cytotoxic", "type III immune complex", "type IV delayed", "serum sickness", "Arthus"] },
  { title: "Immunodeficiencies", fa: "130-134", sectionId: "immuno", pathoma: null, sketchy: null, bnb: "Immuno: Immunodeficiency", anking: "Immunology::Immunodeficiency", keywords: ["SCID", "DiGeorge", "Bruton", "CVID", "Wiskott-Aldrich", "CGD", "IgA deficiency", "hyper-IgM", "Job"] },
  { title: "Transplant rejection & immunosuppressants", fa: "134-138", sectionId: "immuno", pathoma: null, sketchy: "Immuno: Immunosuppressants", bnb: "Immuno: Transplant", anking: "Immunology::Transplant", keywords: ["hyperacute", "acute", "chronic", "GVHD", "cyclosporine", "tacrolimus", "sirolimus", "azathioprine"] },
  { title: "Gram-positive bacteria", fa: "142-153", sectionId: "micro", pathoma: null, sketchy: "Micro: Gram+ Bacteria", bnb: "Micro: Gram+", anking: "Microbiology::Gram_Positive", keywords: ["Staph aureus", "MRSA", "Strep pyogenes", "Strep pneumoniae", "Clostridium", "Listeria", "Bacillus", "diphtheria", "tetanus", "botulism"] },
  { title: "Gram-negative bacteria", fa: "153-162", sectionId: "micro", pathoma: null, sketchy: "Micro: Gram- Bacteria", bnb: "Micro: Gram-", anking: "Microbiology::Gram_Negative", keywords: ["Neisseria", "Haemophilus", "E. coli", "Klebsiella", "Pseudomonas", "Salmonella", "Shigella", "Campylobacter", "Helicobacter", "Legionella"] },
  { title: "Mycobacteria & spirochetes", fa: "162-166", sectionId: "micro", pathoma: null, sketchy: "Micro: Mycobacteria", bnb: "Micro: Special Bacteria", anking: "Microbiology::Mycobacteria", keywords: ["TB", "leprosy", "MAC", "RIPE", "Treponema", "syphilis", "Borrelia", "Lyme", "Leptospira", "VDRL", "FTA-ABS"] },
  { title: "Fungi", fa: "170-178", sectionId: "micro", pathoma: null, sketchy: "Micro: Fungi", bnb: "Micro: Fungi", anking: "Microbiology::Fungi", keywords: ["Candida", "Aspergillus", "Cryptococcus", "Histoplasma", "Coccidioides", "Blastomyces", "PCP", "amphotericin", "fluconazole"] },
  { title: "Parasites & protozoa", fa: "178-186", sectionId: "micro", pathoma: null, sketchy: "Micro: Parasites", bnb: "Micro: Parasites", anking: "Microbiology::Parasites", keywords: ["Plasmodium", "malaria", "Toxoplasma", "Giardia", "Entamoeba", "Trypanosoma", "Cryptosporidium", "hookworm", "pinworm"] },
  { title: "DNA & RNA viruses", fa: "186-200", sectionId: "micro", pathoma: null, sketchy: "Micro: Viruses", bnb: "Micro: Viruses", anking: "Microbiology::Viruses", keywords: ["HSV", "VZV", "EBV", "CMV", "HPV", "HBV", "HIV", "influenza", "HCV", "rotavirus", "rabies", "Ebola"] },
  { title: "Antimicrobials", fa: "200-215", sectionId: "micro", pathoma: null, sketchy: "Pharm: Antimicrobials", bnb: "Pharm: Antibiotics", anking: "Microbiology::Antimicrobials", keywords: ["penicillin", "cephalosporin", "carbapenem", "vancomycin", "fluoroquinolone", "macrolide", "tetracycline", "aminoglycoside", "sulfonamide", "resistance"] },
  { title: "Cell injury, necrosis & apoptosis", fa: "222-226", sectionId: "path", pathoma: "Ch 1", sketchy: null, bnb: "Path: Cell Injury", anking: "Pathology::Cell_Injury", keywords: ["coagulative", "liquefactive", "caseous", "fat necrosis", "fibrinoid", "gangrenous", "free radicals", "ischemia", "reperfusion"] },
  { title: "Inflammation", fa: "226-232", sectionId: "path", pathoma: "Ch 2", sketchy: null, bnb: "Path: Inflammation", anking: "Pathology::Inflammation", keywords: ["acute", "chronic", "granuloma", "prostaglandin", "leukotriene", "histamine", "neutrophil", "macrophage", "wound healing"] },
  { title: "Neoplasia & tumor biology", fa: "232-240", sectionId: "path", pathoma: "Ch 3", sketchy: null, bnb: "Path: Neoplasia", anking: "Pathology::Neoplasia", keywords: ["oncogene", "tumor suppressor", "p53", "Rb", "ras", "myc", "metastasis", "tumor markers", "paraneoplastic", "carcinogen"] },
  { title: "Hemodynamics (thrombus, embolus, shock)", fa: "240-247", sectionId: "path", pathoma: "Ch 4-5", sketchy: null, bnb: "Path: Hemodynamics", anking: "Pathology::Hemodynamics", keywords: ["Virchow triad", "DVT", "PE", "DIC", "shock", "edema", "infarction", "amniotic fluid embolism"] },
  { title: "Pharmacokinetics & pharmacodynamics", fa: "248-254", sectionId: "pharm", pathoma: null, sketchy: null, bnb: "Pharm: PK/PD", anking: "Pharmacology::Pharmacokinetics", keywords: ["bioavailability", "Vd", "clearance", "half-life", "first-pass", "zero-order", "efficacy", "potency", "therapeutic index", "agonist", "antagonist"] },
  { title: "Autonomic drugs", fa: "254-262", sectionId: "pharm", pathoma: null, sketchy: "Pharm: Autonomics", bnb: "Pharm: ANS", anking: "Pharmacology::Autonomic", keywords: ["cholinergic", "anticholinergic", "sympathomimetic", "sympatholytic", "atropine", "epinephrine", "alpha", "beta", "muscarinic", "nicotinic"] },
  { title: "Biostatistics", fa: "276-284", sectionId: "pubhealth", pathoma: null, sketchy: null, bnb: "Biostats", anking: "Public_Health::Biostatistics", keywords: ["sensitivity", "specificity", "PPV", "NPV", "prevalence", "incidence", "odds ratio", "relative risk", "NNT", "confidence interval", "p-value"] },
  { title: "Epidemiology & study design", fa: "284-290", sectionId: "pubhealth", pathoma: null, sketchy: null, bnb: "Biostats: Study Design", anking: "Public_Health::Epidemiology", keywords: ["cohort", "case-control", "cross-sectional", "RCT", "meta-analysis", "bias", "confounding", "blinding"] },
  { title: "Ethics & legal medicine", fa: "290-296", sectionId: "pubhealth", pathoma: null, sketchy: null, bnb: "Biostats: Ethics", anking: "Public_Health::Ethics", keywords: ["autonomy", "beneficence", "nonmaleficence", "justice", "informed consent", "capacity", "Tarasoff", "malpractice", "advance directive"] },
  { title: "Cardiac embryology & anatomy", fa: "304-310", sectionId: "cardio", pathoma: null, sketchy: null, bnb: "Cardio: Embryology", anking: "Cardiovascular::Embryology", keywords: ["truncus arteriosus", "septation", "ASD", "VSD", "coronary arteries", "LAD", "RCA"] },
  { title: "Cardiac physiology", fa: "310-318", sectionId: "cardio", pathoma: null, sketchy: null, bnb: "Cardio: Physiology", anking: "Cardiovascular::Physiology", keywords: ["cardiac output", "preload", "afterload", "Frank-Starling", "Wiggers", "action potential", "pacemaker", "pressure-volume loop", "ejection fraction"] },
  { title: "Heart sounds & murmurs", fa: "318-320", sectionId: "cardio", pathoma: "Ch 8", sketchy: null, bnb: "Cardio: Murmurs", anking: "Cardiovascular::Heart_Sounds", keywords: ["S1", "S2", "S3", "S4", "systolic murmur", "diastolic murmur", "aortic stenosis", "mitral regurgitation", "MVP"] },
  { title: "Congenital heart defects", fa: "320-324", sectionId: "cardio", pathoma: null, sketchy: null, bnb: "Cardio: Congenital", anking: "Cardiovascular::Congenital", keywords: ["VSD", "ASD", "PDA", "coarctation", "tetralogy of Fallot", "transposition", "Eisenmenger", "cyanotic"] },
  { title: "Heart failure & cardiomyopathy", fa: "324-327", sectionId: "cardio", pathoma: "Ch 8", sketchy: null, bnb: "Cardio: HF", anking: "Cardiovascular::Heart_Failure", keywords: ["systolic", "diastolic", "HFrEF", "HFpEF", "BNP", "dilated", "hypertrophic", "restrictive"] },
  { title: "Ischemic heart disease & MI", fa: "327-330", sectionId: "cardio", pathoma: "Ch 8", sketchy: null, bnb: "Cardio: Ischemic", anking: "Cardiovascular::Ischemic", keywords: ["angina", "STEMI", "NSTEMI", "troponin", "CK-MB", "atherosclerosis"] },
  { title: "Arrhythmias & ECG", fa: "330-335", sectionId: "cardio", pathoma: null, sketchy: null, bnb: "Cardio: Arrhythmias", anking: "Cardiovascular::Arrhythmias", keywords: ["AFib", "SVT", "V-tach", "V-fib", "heart block", "long QT", "WPW", "ECG"] },
  { title: "Cardiac pharmacology", fa: "337-349", sectionId: "cardio", pathoma: null, sketchy: "Pharm: Cardiac", bnb: "Pharm: Cardiac", anking: "Cardiovascular::Pharmacology", keywords: ["ACE inhibitor", "ARB", "beta-blocker", "CCB", "digoxin", "diuretic", "antiarrhythmic", "statin", "warfarin", "heparin"] },
  { title: "Hypothalamus & pituitary", fa: "350-355", sectionId: "endo", pathoma: "Ch 16", sketchy: null, bnb: "Endo: HPA", anking: "Endocrine::Hypothalamus_Pituitary", keywords: ["GH", "prolactin", "ACTH", "TSH", "ADH", "oxytocin", "Sheehan", "acromegaly", "diabetes insipidus"] },
  { title: "Thyroid disorders", fa: "355-362", sectionId: "endo", pathoma: "Ch 16", sketchy: null, bnb: "Endo: Thyroid", anking: "Endocrine::Thyroid", keywords: ["Graves", "Hashimoto", "thyroid storm", "T3", "T4", "TSH", "papillary", "follicular", "thyroid cancer"] },
  { title: "Adrenal disorders", fa: "362-368", sectionId: "endo", pathoma: "Ch 16", sketchy: null, bnb: "Endo: Adrenal", anking: "Endocrine::Adrenal", keywords: ["Cushing", "Addison", "Conn", "pheochromocytoma", "CAH", "21-hydroxylase", "cortisol", "aldosterone"] },
  { title: "Diabetes mellitus", fa: "368-374", sectionId: "endo", pathoma: "Ch 16", sketchy: "Pharm: Diabetes", bnb: "Endo: Diabetes", anking: "Endocrine::Diabetes", keywords: ["type 1", "type 2", "DKA", "HHS", "insulin", "metformin", "sulfonylurea", "GLP-1", "SGLT2", "HbA1c"] },
  { title: "Calcium & parathyroid / MEN", fa: "374-378", sectionId: "endo", pathoma: "Ch 16", sketchy: null, bnb: "Endo: Calcium", anking: "Endocrine::Calcium", keywords: ["PTH", "vitamin D", "calcitonin", "hypercalcemia", "MEN 1", "MEN 2A", "MEN 2B", "pseudohypoparathyroidism"] },
  { title: "GI embryology & anatomy", fa: "384-390", sectionId: "gi", pathoma: null, sketchy: null, bnb: "GI: Anatomy", anking: "Gastrointestinal::Anatomy", keywords: ["foregut", "midgut", "hindgut", "celiac", "SMA", "IMA", "peritoneum", "Meckel"] },
  { title: "GI physiology & secretion", fa: "390-398", sectionId: "gi", pathoma: null, sketchy: null, bnb: "GI: Physiology", anking: "Gastrointestinal::Physiology", keywords: ["gastrin", "secretin", "CCK", "pepsin", "HCl", "parietal cell", "bile", "pancreatic enzymes"] },
  { title: "Esophageal & gastric disorders", fa: "398-404", sectionId: "gi", pathoma: "Ch 9", sketchy: null, bnb: "GI: Esophagus/Stomach", anking: "Gastrointestinal::Esophagus", keywords: ["GERD", "Barrett", "achalasia", "varices", "Mallory-Weiss", "peptic ulcer", "H. pylori", "Zollinger-Ellison"] },
  { title: "Liver pathology", fa: "404-412", sectionId: "gi", pathoma: "Ch 10", sketchy: null, bnb: "GI: Liver", anking: "Gastrointestinal::Liver", keywords: ["hepatitis", "cirrhosis", "portal hypertension", "HCC", "Wilson", "hemochromatosis", "alpha-1 antitrypsin", "Budd-Chiari", "jaundice"] },
  { title: "Biliary & pancreatic disorders", fa: "412-416", sectionId: "gi", pathoma: "Ch 10", sketchy: null, bnb: "GI: Biliary/Pancreas", anking: "Gastrointestinal::Biliary", keywords: ["gallstones", "cholecystitis", "cholangitis", "PSC", "PBC", "pancreatitis", "pancreatic cancer"] },
  { title: "IBD & colorectal cancer", fa: "416-420", sectionId: "gi", pathoma: "Ch 9", sketchy: null, bnb: "GI: IBD/CRC", anking: "Gastrointestinal::IBD", keywords: ["Crohn", "ulcerative colitis", "FAP", "Lynch", "APC", "adenoma-carcinoma", "CEA"] },
  { title: "GI pharmacology", fa: "420-429", sectionId: "gi", pathoma: null, sketchy: "Pharm: GI", bnb: "Pharm: GI", anking: "Gastrointestinal::Pharmacology", keywords: ["PPI", "H2 blocker", "antacid", "misoprostol", "ondansetron", "loperamide"] },
  { title: "Anemia & RBC disorders", fa: "430-440", sectionId: "heme", pathoma: "Ch 6", sketchy: null, bnb: "Heme: Anemia", anking: "Hematology::Anemia", keywords: ["iron deficiency", "B12", "folate", "sickle cell", "thalassemia", "spherocytosis", "G6PD", "hemolytic", "aplastic", "microcytic", "macrocytic"] },
  { title: "Coagulation & bleeding disorders", fa: "440-450", sectionId: "heme", pathoma: "Ch 7", sketchy: null, bnb: "Heme: Coagulation", anking: "Hematology::Coagulation", keywords: ["PT", "PTT", "hemophilia", "von Willebrand", "DIC", "TTP", "HUS", "ITP", "factor V Leiden"] },
  { title: "Leukemia & lymphoma", fa: "450-462", sectionId: "heme", pathoma: "Ch 11", sketchy: null, bnb: "Heme: Leukemia", anking: "Hematology::Leukemia", keywords: ["ALL", "AML", "CLL", "CML", "Hodgkin", "Reed-Sternberg", "Burkitt", "Philadelphia", "Auer rods", "smudge cells"] },
  { title: "Myeloproliferative & plasma cell", fa: "462-466", sectionId: "heme", pathoma: "Ch 11", sketchy: null, bnb: "Heme: Myeloproliferative", anking: "Hematology::Myeloproliferative", keywords: ["polycythemia vera", "myelofibrosis", "multiple myeloma", "Waldenstrom", "JAK2", "Bence Jones"] },
  { title: "Bone & joint disorders", fa: "470-480", sectionId: "msk", pathoma: "Ch 17", sketchy: null, bnb: "MSK: Bone", anking: "MSK::Bone", keywords: ["osteoporosis", "Paget", "osteosarcoma", "Ewing", "RA", "OA", "gout", "pseudogout", "septic arthritis"] },
  { title: "Neuromuscular disorders", fa: "480-490", sectionId: "msk", pathoma: "Ch 17", sketchy: null, bnb: "MSK: Neuromuscular", anking: "MSK::Neuromuscular", keywords: ["myasthenia gravis", "Lambert-Eaton", "dermatomyositis", "Duchenne", "Becker", "rhabdomyolysis"] },
  { title: "Skin disorders & dermatology", fa: "490-510", sectionId: "msk", pathoma: "Ch 18", sketchy: null, bnb: "MSK: Derm", anking: "MSK::Skin", keywords: ["melanoma", "BCC", "SCC", "psoriasis", "eczema", "pemphigus", "bullous pemphigoid", "acanthosis nigricans"] },
  { title: "Neuroanatomy & pathways", fa: "520-535", sectionId: "neuro", pathoma: null, sketchy: null, bnb: "Neuro: Anatomy", anking: "Neurology::Neuroanatomy", keywords: ["cortex", "brainstem", "thalamus", "basal ganglia", "cerebellum", "spinal cord", "cranial nerves", "brachial plexus", "dermatomes"] },
  { title: "Cerebrovascular disease", fa: "537-542", sectionId: "neuro", pathoma: "Ch 19", sketchy: null, bnb: "Neuro: Stroke", anking: "Neurology::Cerebrovascular", keywords: ["stroke", "MCA", "ACA", "PCA", "lacunar", "hemorrhagic", "SAH", "epidural", "subdural", "tPA", "berry aneurysm"] },
  { title: "Degenerative diseases & dementia", fa: "542-548", sectionId: "neuro", pathoma: "Ch 19", sketchy: null, bnb: "Neuro: Degenerative", anking: "Neurology::Degenerative", keywords: ["Alzheimer", "Parkinson", "Huntington", "ALS", "MS", "Lewy body", "prion", "CJD", "amyloid", "tau"] },
  { title: "Seizures & epilepsy", fa: "548-552", sectionId: "neuro", pathoma: null, sketchy: null, bnb: "Neuro: Seizures", anking: "Neurology::Seizures", keywords: ["tonic-clonic", "absence", "status epilepticus", "phenytoin", "carbamazepine", "valproate", "lamotrigine", "levetiracetam"] },
  { title: "CNS tumors", fa: "552-556", sectionId: "neuro", pathoma: "Ch 20", sketchy: null, bnb: "Neuro: Tumors", anking: "Neurology::CNS_Tumors", keywords: ["glioblastoma", "meningioma", "schwannoma", "medulloblastoma", "craniopharyngioma", "pituitary adenoma"] },
  { title: "Neuro pharmacology", fa: "560-589", sectionId: "neuro", pathoma: null, sketchy: "Pharm: Neuro", bnb: "Pharm: Neuro", anking: "Neurology::Pharmacology", keywords: ["L-DOPA", "benzodiazepine", "SSRI", "SNRI", "TCA", "MAOi", "opioid", "anesthetics", "sumatriptan"] },
  { title: "Psychiatric disorders", fa: "590-608", sectionId: "psych", pathoma: null, sketchy: null, bnb: "Psych: Disorders", anking: "Psychiatry::Disorders", keywords: ["schizophrenia", "bipolar", "MDD", "anxiety", "OCD", "PTSD", "panic", "personality disorders", "cluster A", "cluster B", "cluster C"] },
  { title: "Substance use & withdrawal", fa: "608-612", sectionId: "psych", pathoma: null, sketchy: null, bnb: "Psych: Substance", anking: "Psychiatry::Substance", keywords: ["alcohol withdrawal", "DTs", "opioid", "cocaine", "amphetamine", "naloxone", "disulfiram"] },
  { title: "Renal physiology", fa: "616-626", sectionId: "renal", pathoma: null, sketchy: null, bnb: "Renal: Physiology", anking: "Renal::Physiology", keywords: ["GFR", "clearance", "PCT", "loop of Henle", "DCT", "collecting duct", "ADH", "aldosterone", "RAAS", "Starling"] },
  { title: "Acid-base disorders", fa: "626-630", sectionId: "renal", pathoma: null, sketchy: null, bnb: "Renal: Acid-Base", anking: "Renal::Acid_Base", keywords: ["metabolic acidosis", "metabolic alkalosis", "respiratory acidosis", "anion gap", "MUDPILES", "Winter formula", "RTA"] },
  { title: "Glomerular diseases", fa: "630-636", sectionId: "renal", pathoma: "Ch 14", sketchy: null, bnb: "Renal: Glomerular", anking: "Renal::Glomerular", keywords: ["nephrotic", "nephritic", "minimal change", "FSGS", "membranous", "IgA", "RPGN", "Goodpasture", "Alport", "lupus nephritis"] },
  { title: "Tubular & renal pathology", fa: "636-640", sectionId: "renal", pathoma: "Ch 15", sketchy: null, bnb: "Renal: Tubular", anking: "Renal::Tubular", keywords: ["ATN", "AIN", "RTA", "Fanconi", "polycystic kidney", "RCC", "Wilms"] },
  { title: "Diuretics & renal pharmacology", fa: "640-649", sectionId: "renal", pathoma: null, sketchy: "Pharm: Renal", bnb: "Pharm: Diuretics", anking: "Renal::Pharmacology", keywords: ["thiazide", "furosemide", "spironolactone", "mannitol", "acetazolamide", "amiloride", "K-sparing"] },
  { title: "Reproductive embryology & anatomy", fa: "650-660", sectionId: "repro", pathoma: null, sketchy: null, bnb: "Repro: Anatomy", anking: "Reproductive::Anatomy", keywords: ["ovary", "uterus", "testes", "spermatogenesis", "oogenesis", "placenta", "teratogen"] },
  { title: "Menstrual cycle & hormones", fa: "660-665", sectionId: "repro", pathoma: null, sketchy: null, bnb: "Repro: Hormones", anking: "Reproductive::Hormones", keywords: ["estrogen", "progesterone", "LH surge", "FSH", "ovulation", "hCG", "GnRH"] },
  { title: "Reproductive pathology", fa: "665-685", sectionId: "repro", pathoma: "Ch 12-13", sketchy: null, bnb: "Repro: Pathology", anking: "Reproductive::Pathology", keywords: ["endometriosis", "PCOS", "fibroids", "cervical cancer", "ovarian cancer", "testicular cancer", "BPH", "prostate cancer", "preeclampsia", "ectopic"] },
  { title: "Respiratory physiology", fa: "698-706", sectionId: "resp", pathoma: null, sketchy: null, bnb: "Resp: Physiology", anking: "Respiratory::Physiology", keywords: ["lung volumes", "compliance", "surfactant", "V/Q mismatch", "shunt", "dead space", "O2-Hb curve", "Bohr effect"] },
  { title: "Obstructive lung diseases", fa: "706-712", sectionId: "resp", pathoma: "Ch 8", sketchy: null, bnb: "Resp: Obstructive", anking: "Respiratory::Obstructive", keywords: ["COPD", "emphysema", "chronic bronchitis", "asthma", "bronchiectasis", "FEV1/FVC", "cystic fibrosis"] },
  { title: "Restrictive lung diseases", fa: "712-716", sectionId: "resp", pathoma: "Ch 8", sketchy: null, bnb: "Resp: Restrictive", anking: "Respiratory::Restrictive", keywords: ["IPF", "sarcoidosis", "asbestosis", "silicosis", "ARDS", "neonatal RDS"] },
  { title: "Lung cancer & pleural disease", fa: "716-720", sectionId: "resp", pathoma: "Ch 8", sketchy: null, bnb: "Resp: Lung Cancer", anking: "Respiratory::Lung_Cancer", keywords: ["small cell", "squamous", "adenocarcinoma", "Pancoast", "SVC syndrome", "pleural effusion", "mesothelioma"] },
  { title: "Pneumonia & pulmonary infections", fa: "718-722", sectionId: "resp", pathoma: null, sketchy: null, bnb: "Resp: Pneumonia", anking: "Respiratory::Pneumonia", keywords: ["CAP", "HAP", "aspiration", "Strep pneumoniae", "Mycoplasma", "Legionella", "PCP", "TB", "lung abscess"] },
  { title: "Respiratory pharmacology", fa: "722-727", sectionId: "resp", pathoma: null, sketchy: "Pharm: Resp", bnb: "Pharm: Resp", anking: "Respiratory::Pharmacology", keywords: ["albuterol", "ipratropium", "ICS", "montelukast", "theophylline", "omalizumab"] }
];

export function searchTopics(query) {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const terms = query.toLowerCase().trim().split(/\s+/);

  return topics
    .map((topic) => {
      const haystack = `${topic.title} ${topic.keywords.join(" ")}`.toLowerCase();
      let score = 0;

      terms.forEach((term) => {
        if (topic.title.toLowerCase().includes(term)) {
          score += 10;
        }

        if (topic.keywords.some((keyword) => keyword.toLowerCase().includes(term))) {
          score += 5;
        } else if (haystack.includes(term)) {
          score += 2;
        }
      });

      return { ...topic, score };
    })
    .filter((topic) => topic.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 15);
}
