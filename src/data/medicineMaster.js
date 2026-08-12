function strengths(
  name,
  values,
  unit = "mg",
  options = {},
) {
  return values.map((strength) => ({
    name,
    strength: String(strength),
    unit,
    category: options.category || "",
    aliases: options.aliases || [],
  }));
}

export const medicineMaster = [
  ...strengths(
    "Carbidopa + Levodopa",
    [
      "10/100",
      "25/100",
      "25/250",
    ],
    "mg",
    {
      category: "Parkinson / Movement Disorder",
      aliases: [
        "levodopa",
        "carbidopa",
        "syndopa",
        "parkinson",
        "dbs",
      ],
    },
  ),

  ...strengths(
    "Carbidopa + Levodopa CR",
    [
      "25/100",
      "50/200",
    ],
    "mg",
    {
      category: "Parkinson / Movement Disorder",
      aliases: [
        "syndopa cr",
        "controlled release",
        "parkinson",
        "dbs",
      ],
    },
  ),

  ...strengths(
    "Carbidopa + Levodopa + Entacapone",
    [
      "12.5/50/200",
      "18.75/75/200",
      "25/100/200",
      "31.25/125/200",
      "37.5/150/200",
      "50/200/200",
    ],
    "mg",
    {
      category: "Parkinson / Movement Disorder",
      aliases: [
        "stalevo",
        "entacapone",
        "parkinson",
        "dbs",
      ],
    },
  ),

  ...strengths(
    "Pramipexole",
    [
      "0.125",
      "0.25",
      "0.5",
      "0.75",
      "1",
      "1.5",
    ],
    "mg",
    {
      category: "Parkinson / Movement Disorder",
      aliases: [
        "pramipex",
        "dopamine agonist",
        "parkinson",
        "dbs",
      ],
    },
  ),

  ...strengths(
    "Pramipexole ER",
    [
      "0.375",
      "0.75",
      "1.5",
      "2.25",
      "3",
      "3.75",
      "4.5",
    ],
    "mg",
    {
      category: "Parkinson / Movement Disorder",
      aliases: [
        "pramipex er",
        "extended release",
        "parkinson",
        "dbs",
      ],
    },
  ),

  ...strengths(
    "Ropinirole",
    [
      "0.25",
      "0.5",
      "1",
      "2",
      "3",
      "4",
      "5",
    ],
    "mg",
    {
      category: "Parkinson / Movement Disorder",
      aliases: [
        "dopamine agonist",
        "parkinson",
        "dbs",
      ],
    },
  ),

  ...strengths(
    "Rasagiline",
    [
      "0.5",
      "1",
    ],
    "mg",
    {
      category: "Parkinson / Movement Disorder",
      aliases: [
        "azilect",
        "mao b",
        "parkinson",
        "dbs",
      ],
    },
  ),

  ...strengths(
    "Safinamide",
    [
      "50",
      "100",
    ],
    "mg",
    {
      category: "Parkinson / Movement Disorder",
      aliases: [
        "xadago",
        "parkinson",
        "dbs",
      ],
    },
  ),

  ...strengths(
    "Amantadine",
    ["100"],
    "mg",
    {
      category: "Parkinson / Movement Disorder",
      aliases: [
        "parkinson",
        "dyskinesia",
        "dbs",
      ],
    },
  ),

  ...strengths(
    "Entacapone",
    ["200"],
    "mg",
    {
      category: "Parkinson / Movement Disorder",
      aliases: [
        "comt inhibitor",
        "parkinson",
        "dbs",
      ],
    },
  ),

  ...strengths(
    "Trihexyphenidyl",
    [
      "2",
      "5",
    ],
    "mg",
    {
      category: "Parkinson / Movement Disorder",
      aliases: [
        "trihex",
        "parkinson",
        "tremor",
        "dystonia",
        "dbs",
      ],
    },
  ),

  ...strengths(
    "BOTOX (OnabotulinumtoxinA)",
    [
      "100",
      "200",
    ],
    "Units",
    {
      category: "Botulinum Toxin",
      aliases: [
        "botox",
        "botulinum",
        "dystonia",
        "spasticity",
        "movement disorder",
      ],
    },
  ),

  ...strengths(
    "XEOMIN (IncobotulinumtoxinA)",
    [
      "50",
      "100",
      "200",
    ],
    "Units",
    {
      category: "Botulinum Toxin",
      aliases: [
        "xeomin",
        "botulinum",
        "dystonia",
        "spasticity",
      ],
    },
  ),

  ...strengths(
    "DYSPORT (AbobotulinumtoxinA)",
    [
      "300",
      "500",
    ],
    "Units",
    {
      category: "Botulinum Toxin",
      aliases: [
        "dysport",
        "botulinum",
        "dystonia",
        "spasticity",
      ],
    },
  ),

  ...strengths(
    "Levetiracetam",
    [
      "250",
      "500",
      "750",
      "1000",
    ],
    "mg",
    {
      category: "Epilepsy",
      aliases: [
        "keppra",
        "seizure",
        "epilepsy",
      ],
    },
  ),

  ...strengths(
    "Lacosamide",
    [
      "50",
      "100",
      "150",
      "200",
    ],
    "mg",
    {
      category: "Epilepsy",
      aliases: [
        "vimpat",
        "seizure",
        "epilepsy",
      ],
    },
  ),

  ...strengths(
    "Lamotrigine",
    [
      "25",
      "50",
      "100",
      "150",
      "200",
      "250",
    ],
    "mg",
    {
      category: "Epilepsy",
      aliases: [
        "lamictal",
        "seizure",
        "epilepsy",
      ],
    },
  ),

  ...strengths(
    "Oxcarbazepine",
    [
      "150",
      "300",
      "600",
    ],
    "mg",
    {
      category: "Epilepsy",
      aliases: [
        "trileptal",
        "seizure",
        "epilepsy",
      ],
    },
  ),

  ...strengths(
    "Pregabalin",
    [
      "25",
      "50",
      "75",
      "100",
      "150",
      "200",
      "225",
      "300",
    ],
    "mg",
    {
      category: "Neuropathic Pain",
      aliases: [
        "lyrica",
        "neuropathic pain",
      ],
    },
  ),

  ...strengths(
    "Brivaracetam",
    [
      "10",
      "25",
      "50",
      "75",
      "100",
    ],
    "mg",
    {
      category: "Epilepsy",
      aliases: [
        "seizure",
        "epilepsy",
      ],
    },
  ),

  {
    name: "Clobazam",
    strength: "",
    unit: "mg",
    category: "Neurology",
    aliases: ["epilepsy"],
  },
  {
    name: "Clonazepam",
    strength: "",
    unit: "mg",
    category: "Neurology",
    aliases: ["tremor", "dystonia"],
  },
  {
    name: "Carbamazepine",
    strength: "",
    unit: "mg",
    category: "Neurology",
    aliases: ["epilepsy", "neuralgia"],
  },
  {
    name: "Gabapentin",
    strength: "",
    unit: "mg",
    category: "Neurology",
    aliases: ["neuropathic pain"],
  },
  {
    name: "Baclofen",
    strength: "",
    unit: "mg",
    category: "Neurology",
    aliases: ["spasticity"],
  },
  {
    name: "Tizanidine",
    strength: "",
    unit: "mg",
    category: "Neurology",
    aliases: ["spasticity"],
  },
  {
    name: "Propranolol",
    strength: "",
    unit: "mg",
    category: "Movement Disorder",
    aliases: ["tremor"],
  },
  {
    name: "Primidone",
    strength: "",
    unit: "mg",
    category: "Movement Disorder",
    aliases: ["tremor"],
  },
  {
    name: "Topiramate",
    strength: "",
    unit: "mg",
    category: "Neurology",
    aliases: ["epilepsy", "migraine"],
  },
  {
    name: "Donepezil",
    strength: "",
    unit: "mg",
    category: "Cognitive Neurology",
    aliases: ["dementia"],
  },
  {
    name: "Memantine",
    strength: "",
    unit: "mg",
    category: "Cognitive Neurology",
    aliases: ["dementia"],
  },
  {
    name: "Rivastigmine",
    strength: "",
    unit: "mg",
    category: "Cognitive Neurology",
    aliases: ["dementia", "parkinson dementia"],
  },
];
