import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskflow';
const DEFAULT_ORG_CODE = process.env.DEFAULT_ORG_CODE;
const DEFAULT_ORG_NAME = process.env.DEFAULT_ORG_NAME;
const DEFAULT_ORG_PLAN = process.env.DEFAULT_ORG_PLAN;
const DEFAULT_SUPER_ADMIN_NAME = process.env.DEFAULT_SUPER_ADMIN_NAME;
const DEFAULT_SUPER_ADMIN_EMAIL = process.env.DEFAULT_SUPER_ADMIN_EMAIL;
const DEFAULT_SUPER_ADMIN_PASSWORD = process.env.DEFAULT_SUPER_ADMIN_PASSWORD;

const orgSchema = new mongoose.Schema({
  name: String,
  code: String,
  status: String,
  subscriptionPlan: String,
}, { strict: false });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: { type: String, select: false },
  role: String,
  organizationId: mongoose.Schema.Types.ObjectId,
  status: String,
}, { strict: false });

async function seed() {
  try {
    if (!DEFAULT_ORG_CODE || !DEFAULT_ORG_NAME || !DEFAULT_ORG_PLAN || !DEFAULT_SUPER_ADMIN_NAME || !DEFAULT_SUPER_ADMIN_EMAIL || !DEFAULT_SUPER_ADMIN_PASSWORD) {
      throw new Error('Missing seed configuration. Set DEFAULT_ORG_CODE, DEFAULT_ORG_NAME, DEFAULT_ORG_PLAN, DEFAULT_SUPER_ADMIN_NAME, DEFAULT_SUPER_ADMIN_EMAIL, and DEFAULT_SUPER_ADMIN_PASSWORD in your environment.');
    }

    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const Org = mongoose.model('Organization_Seed', orgSchema, 'organizations');
    const User = mongoose.model('User_Seed', userSchema, 'users');

    // 1. Find or create default Organization
    let org = await Org.findOne({ code: DEFAULT_ORG_CODE });
    if (!org) {
      console.log(`Creating default organization ${DEFAULT_ORG_CODE}...`);
      org = await Org.create({
        name: DEFAULT_ORG_NAME,
        code: DEFAULT_ORG_CODE,
        status: 'ACTIVE',
        subscriptionPlan: DEFAULT_ORG_PLAN,
      });
      console.log('Created organization:', org._id);
    } else {
      console.log('Using existing organization:', org._id);
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(DEFAULT_SUPER_ADMIN_PASSWORD, 10);

    // 3. Find or create Super Admin user
    let user = await User.findOne({ email: DEFAULT_SUPER_ADMIN_EMAIL });
    if (user) {
      console.log(`Super Admin user ${DEFAULT_SUPER_ADMIN_EMAIL} already exists. Updating password & role...`);
      user.password = hashedPassword;
      user.role = 'SUPER_ADMIN';
      user.name = DEFAULT_SUPER_ADMIN_NAME;
      user.organizationId = org._id;
      await user.save();
      console.log('User updated successfully.');
    } else {
      console.log(`Creating Super Admin user ${DEFAULT_SUPER_ADMIN_EMAIL}...`);
      user = await User.create({
        name: DEFAULT_SUPER_ADMIN_NAME,
        email: DEFAULT_SUPER_ADMIN_EMAIL,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        organizationId: org._id,
        status: 'ACTIVE',
      });
      console.log('Created Super Admin user:', user._id);
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
