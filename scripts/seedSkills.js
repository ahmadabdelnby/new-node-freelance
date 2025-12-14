/* Seed only realistic skills mapped to existing specialties */
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const Specialty = require('../Models/Specialties')
const Skill = require('../Models/Skills')

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing'

async function connect() {
  await mongoose.connect(MONGODB_URI)
  console.log('✅ Connected to MongoDB')
}

function pickSome(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, arr.length))
}

const libraries = {
  dev: [
    'JavaScript', 'TypeScript', 'HTML5', 'CSS3', 'Sass', 'Tailwind CSS',
    'React', 'Angular', 'Vue.js', 'Next.js', 'Nuxt.js',
    'Node.js', 'Express', 'NestJS', 'GraphQL', 'REST API',
    'Webpack', 'Vite', 'Babel', 'Jest', 'Cypress',
    'Docker', 'Kubernetes', 'Git', 'CI/CD',
    'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
    'React Native', 'Flutter', 'Swift', 'Kotlin', 'Android SDK'
  ],
  design: [
    'Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign',
    'Figma', 'Sketch', 'Adobe XD', 'Wireframing', 'Prototyping',
    'Logo Design', 'Brand Identity', 'Motion Graphics',
    'Adobe Premiere Pro', 'Adobe After Effects', 'Color Grading',
    'Typography', 'Layout Design'
  ],
  marketing: [
    'SEO', 'SEM', 'Google Ads', 'Facebook Ads', 'Instagram Ads',
    'Content Marketing', 'Email Marketing', 'Marketing Automation',
    'Google Analytics', 'GA4', 'A/B Testing', 'Conversion Rate Optimization',
    'Social Media Management', 'Copywriting for Ads'
  ],
  business: [
    'Project Management', 'Agile', 'Scrum', 'Kanban', 'Jira', 'Trello',
    'Excel Advanced', 'Financial Modeling', 'Budgeting', 'Forecasting',
    'Power BI', 'Tableau', 'Business Analysis', 'Process Mapping', 'Risk Management'
  ],
  engarch: [
    'AutoCAD', 'Revit', 'SketchUp', '3ds Max', 'BIM', 'Lumion',
    'SolidWorks', 'ANSYS', 'Architecture Visualization', 'Interior Rendering',
    'Structural Analysis'
  ],
  support: [
    'Microsoft Excel', 'Google Sheets', 'Data Cleaning', 'Data Entry', 'CRM (Salesforce)',
    'CRM (HubSpot)', 'Web Research', 'Customer Support', 'Email Handling', 'Ticketing Systems'
  ],
  writing: [
    'Copywriting', 'Technical Writing', 'Proofreading', 'Editing', 'SEO Writing',
    'Academic Writing', 'Article Writing', 'Blog Writing', 'Content Strategy', 'Translation (Arabic-English)'
  ],
  training: [
    'Instructional Design', 'Curriculum Development', 'E-Learning Authoring (Articulate)',
    'E-Learning Authoring (Captivate)', 'LMS Administration (Moodle)', 'Assessment Design',
    'Lesson Planning', 'Classroom Management', 'PowerPoint Advanced', 'English Teaching'
  ]
}

function groupForSpecialty(name) {
  const n = name.toLowerCase()
  if (/(program|software|web|php|android|app)/.test(n)) return 'dev'
  if (/(design|photoshop|illustrator|logo|video|poster)/.test(n)) return 'design'
  if (/(marketing|ads|campaign|social|google)/.test(n)) return 'marketing'
  if (/(project management|accounting|finance|plan|report|analysis|consult)/.test(n)) return 'business'
  if (/(architect|autocad|3d|interior|engineering|building|visualization|revit|bim)/.test(n)) return 'engarch'
  if (/(data|crm|excel|entry|research|customer)/.test(n)) return 'support'
  if (/(writing|proofreading|article|editing|rewriting|academic|arabic)/.test(n)) return 'writing'
  if (/(training|tutoring|e-learning|english|powerpoint)/.test(n)) return 'training'
  return 'business'
}

async function seedSkills({ clear = false } = {}) {
  await connect()

  if (clear) {
    await Skill.deleteMany({})
    console.log('🧹 Cleared existing skills')
  }

  const specialties = await Specialty.find({ isActive: { $ne: false } })
  console.log(`🎯 Found ${specialties.length} specialties`)

  const existingSkillNames = new Set(
    (await Skill.find({}, 'name')).map((s) => s.name.toLowerCase())
  )

  const docs = []
  for (const spec of specialties) {
    const group = groupForSpecialty(spec.name)
    const base = libraries[group]
    const selection = pickSome(base, 6)

    for (const rawName of selection) {
      let name = rawName
      if (existingSkillNames.has(name.toLowerCase())) {
        name = `${rawName} (${spec.name})` // ensure global uniqueness
      }
      existingSkillNames.add(name.toLowerCase())
      docs.push({ name, specialty: spec._id, description: `${name} skill for ${spec.name}` })
    }
  }

  if (docs.length === 0) {
    console.log('ℹ️ No skills to insert')
    await mongoose.disconnect()
    return
  }

  const result = await Skill.insertMany(docs, { ordered: false })
  console.log(`🛠️ Inserted ${result.length} skills`)

  await mongoose.disconnect()
  console.log('🔌 Disconnected')
}

seedSkills({ clear: false }).catch(async (err) => {
  console.error('❌ Seeding skills failed', err)
  await mongoose.disconnect()
  process.exit(1)
})
