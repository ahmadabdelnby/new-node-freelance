/* Seed script to populate the database with sample categories, specialties, skills, users, jobs, and proposals */
const mongoose = require('mongoose')
const dotenv = require('dotenv')
const Category = require('../Models/Categories')
const Specialty = require('../Models/Specialties')
const Skill = require('../Models/Skills')
const User = require('../Models/User')
const Job = require('../Models/Jobs')
const Proposal = require('../Models/proposals')

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/freelancing'

async function connect() {
  await mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  console.log('✅ Connected to MongoDB')
}

function pick(arr, count) {
  const copy = [...arr]
  const result = []
  while (copy.length && result.length < count) {
    const idx = Math.floor(Math.random() * copy.length)
    result.push(copy.splice(idx, 1)[0])
  }
  return result
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDoc(docs) {
  return docs[Math.floor(Math.random() * docs.length)]
}

async function seed() {
  await connect()

  // Clean collections for a fresh seed (remove if you want to keep existing data)
  await Promise.all([
    Proposal.deleteMany({}),
    Job.deleteMany({}),
    User.deleteMany({}),
    Skill.deleteMany({}),
    Specialty.deleteMany({}),
    Category.deleteMany({})
  ])
  console.log('🧹 Cleared existing data')

  // Categories & Specialties translated to English (deduplicated globally)
  const categorySpecialties = [
    {
      category: 'Remote Training & Education',
      specialties: [
        'Remote Training',
        'Private Tutoring',
        'E-Learning',
        'Instructional Design',
        'Training Package Design',
        'English Language',
        'English Grammar Teaching',
        'PowerPoint',
        'Creative Design',
        'Learn English'
      ]
    },
    {
      category: 'Support, Assistance & Data Entry',
      specialties: [
        'Data Entry',
        'Virtual Assistant',
        'Microsoft Excel',
        'Customer Service',
        'Data Extraction',
        'Data Processing',
        'CRM Management',
        'Data Analysis',
        'Product Auditing',
        'Internet Research'
      ]
    },
    {
      category: 'Engineering, Architecture & Interior Design',
      specialties: [
        'Architecture',
        'Architectural Design',
        'Architectural Drafting',
        'AutoCAD',
        '3D Design',
        'Interior Design',
        'Concept Design',
        'Engineering',
        'Building Architecture',
        'Architectural Visualization'
      ]
    },
    {
      category: 'Programming, Web & App Development',
      specialties: [
        'Programming',
        'Website Programming',
        'Software Development',
        'Software Engineering',
        'App Development',
        'Website Design',
        'Website Creation',
        'PHP',
        'Web Development',
        'Android Development'
      ]
    },
    {
      category: 'Business & Consulting Services',
      specialties: [
        'Project Management',
        'Financial Accounting',
        'Accounting',
        'Financial Management',
        'Business Plan',
        'Business Management',
        'Cost Accounting',
        'Report Writing',
        'Financial Analysis',
        'Risk Analysis'
      ]
    },
    {
      category: 'Writing, Editing, Translation & Languages',
      specialties: [
        'Creative Writing',
        'Content Writing',
        'Online Writing',
        'Proofreading',
        'Article Writing',
        'Content Editing',
        'Content Rewriting',
        'Text Formatting',
        'Academic Writing',
        'Arabic Language'
      ]
    },
    {
      category: 'Digital Marketing & Sales',
      specialties: [
        'Digital Marketing',
        'Marketing Management',
        'Online Marketing',
        'Social Media Marketing',
        'Search Engine Marketing',
        'Marketing Plan',
        'Facebook Marketing',
        'Ad Campaign',
        'Social Accounts Management',
        'Google Ads'
      ]
    },
    {
      category: 'Design, Video & Audio',
      specialties: [
        'Creative Design',
        'Graphic Design',
        'Photoshop',
        'Concept Design',
        'Logo Design',
        'Adobe Illustrator',
        'Video Production',
        'Video Design',
        'Ad Design',
        'Poster Design'
      ]
    }
  ]

  const categoriesData = categorySpecialties.map((c) => ({
    name: c.category,
    description: `${c.category} - imported`
  }))

  const categories = await Category.insertMany(categoriesData)
  const catMap = Object.fromEntries(categories.map((c) => [c.name, c]))
  console.log(`📁 Inserted ${categories.length} categories`)

  // Deduplicate specialties globally
  const seenSpecialties = new Set()
  const specialtiesData = []
  for (const entry of categorySpecialties) {
    const catId = catMap[entry.category]._id
    for (const specName of entry.specialties) {
      if (seenSpecialties.has(specName)) continue
      seenSpecialties.add(specName)
      specialtiesData.push({
        name: specName,
        description: `${specName} - imported`,
        Category: catId
      })
    }
  }

  const specialties = await Specialty.insertMany(specialtiesData)
  const specMap = Object.fromEntries(specialties.map((s) => [s.name, s]))
  console.log(`🎯 Inserted ${specialties.length} specialties`)

  const categoryList = categories
  const specialtyList = specialties

  // Skills: create 3 skills per specialty (ensures > 50 total)
  const skillsData = []
  Object.values(specMap).forEach((spec) => {
    for (let i = 1; i <= 3; i += 1) {
      skillsData.push({
        name: `${spec.name} Skill ${i}`,
        specialty: spec._id,
        description: `Skill ${i} for specialty ${spec.name}`
      })
    }
  })

  const skills = await Skill.insertMany(skillsData)
  const specialtyNames = Object.keys(specMap)
  const skillsBySpec = specialtyNames.reduce((acc, name) => {
    acc[name] = skills.filter((s) => s.specialty.toString() === specMap[name]._id.toString())
    return acc
  }, {})
  console.log(`🛠️  Inserted ${skills.length} skills`)

  // Users (create 50: 10 clients, 40 freelancers)
  const countries = ['USA', 'Canada', 'UK', 'Germany', 'Egypt', 'UAE', 'India', 'France', 'Spain', 'Brazil']
  const genders = ['male', 'female']

  const usersData = []
  const clientsCount = 10
  const freelancersCount = 40

  // Clients
  for (let i = 1; i <= clientsCount; i += 1) {
    const spec = randomDoc(specialtyList)
    usersData.push({
      email: `client${i}@example.com`,
      username: `client${i}`,
      password: 'Passw0rd!',
      confirmPassword: 'Passw0rd!',
      first_name: `Client${i}`,
      last_name: 'User',
      phone_number: `+12025550${100 + i}`,
      gender: genders[i % 2],
      country: randomFrom(countries),
      role: 'user',
      category: spec.Category,
      specialty: spec._id
    })
  }

  // Freelancers
  for (let i = 1; i <= freelancersCount; i += 1) {
    const specName = randomFrom(specialtyNames)
    const specId = specMap[specName]._id
    const specSkills = skillsBySpec[specName]
    const chosenSkills = pick(specSkills.map((s) => s._id), Math.min(3, specSkills.length))

    usersData.push({
      email: `freelancer${i}@example.com`,
      username: `freelancer${i}`,
      password: 'Passw0rd!',
      confirmPassword: 'Passw0rd!',
      first_name: `Freelancer${i}`,
      last_name: 'Pro',
      phone_number: `+12025551${100 + i}`,
      gender: genders[i % 2],
      country: randomFrom(countries),
      role: 'user',
      category: specMap[specName].Category,
      specialty: specId,
      skills: chosenSkills,
      hourlyRate: 20 + (i % 60),
      aboutMe: `Experienced ${specName} specialist delivering quality work across diverse projects. Portfolio includes web apps, APIs, and user-focused solutions. (${i})`
    })
  }

  const users = await User.insertMany(usersData)
  const clients = users.slice(0, clientsCount)
  const freelancers = users.slice(clientsCount)
  console.log(`👥 Inserted ${users.length} users (clients: ${clients.length}, freelancers: ${freelancers.length})`)

  // Jobs (50+)
  const jobStatuses = ['open', 'in_progress', 'completed', 'cancelled']
  const jobsData = []
  for (let i = 1; i <= 50; i += 1) {
    const specName = randomFrom(specialtyNames)
    const specId = specMap[specName]._id
    const specSkills = skillsBySpec[specName]
    const chosenSkills = pick(specSkills.map((s) => s._id), Math.min(3, specSkills.length))
    const budgetType = Math.random() > 0.4 ? 'fixed' : 'hourly'
    const status = randomFrom(jobStatuses)

    jobsData.push({
      client: randomFrom(clients)._id,
      title: `Project ${i}: ${specName} engagement`,
      description: `Project ${i} for ${specName}. Build and deliver scoped features with clean code, testing, and clear communication. Includes milestones and reviews.`,
      specialty: specId,
      skills: chosenSkills,
      budget: { type: budgetType, amount: budgetType === 'fixed' ? 500 + (i * 20) : 20 + (i % 50) },
      status,
      experienceLevel: ['entry', 'intermediate', 'expert'][i % 3],
      visibility: 'public'
    })
  }
  const jobs = await Job.insertMany(jobsData)
  console.log(`💼 Inserted ${jobs.length} jobs`)

  // Proposals (50+ on open jobs, unique per freelancer/job)
  const openJobs = jobs.filter((j) => j.status === 'open')
  if (openJobs.length === 0) {
    throw new Error('No open jobs available to attach proposals')
  }
  const proposalsData = []
  const pairSet = new Set()
  const proposalsTarget = 50
  let attempts = 0

  while (proposalsData.length < proposalsTarget && attempts < proposalsTarget * 5) {
    attempts += 1
    const job = randomFrom(openJobs)
    const freelancer = randomFrom(freelancers)
    const key = `${job._id}-${freelancer._id}`
    if (pairSet.has(key)) continue
    pairSet.add(key)

    proposalsData.push({
      job_id: job._id,
      freelancer_id: freelancer._id,
      coverLetter: `Hello! I will deliver this project with clean code, timely updates, and tests. I have relevant experience in ${job.title}. Looking forward to collaborating. (${proposalsData.length + 1})`,
      bidAmount: Math.max(200, Math.floor(400 + Math.random() * 1000)),
      deliveryTime: 5 + Math.floor(Math.random() * 20)
    })
  }

  const proposals = await Proposal.insertMany(proposalsData)
  console.log(`📨 Inserted ${proposals.length} proposals`)

  // Update proposal counts on jobs
  const proposalsByJob = proposals.reduce((acc, p) => {
    const key = p.job_id.toString()
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  for (const job of jobs) {
    const count = proposalsByJob[job._id.toString()] || 0
    if (count > 0) {
      job.proposalsCount = count
      await job.save()
    }
  }

  console.log('✅ Seeding completed successfully')
  await mongoose.disconnect()
  console.log('🔌 Disconnected')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Seeding failed', err)
  process.exit(1)
})
