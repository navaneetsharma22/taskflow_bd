import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/taskflow';

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
    console.log('Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const Org = mongoose.model('Organization_Seed', orgSchema, 'organizations');
    const User = mongoose.model('User_Seed', userSchema, 'users');

    // 1. Find or create default Organization
    let org = await Org.findOne({ code: 'TF2' });
    if (!org) {
      console.log('Creating default organization TF2...');
      org = await Org.create({
        name: 'TaskFlow HQ',
        code: 'TF2',
        status: 'ACTIVE',
        subscriptionPlan: 'ENTERPRISE',
      });
      console.log('Created organization:', org._id);
    } else {
      console.log('Using existing organization:', org._id);
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash('1234567', 10);

    // 3. Find or create Super Admin user
    let user = await User.findOne({ email: 'navaneet@taskflow.com' });
    if (user) {
      console.log('Super Admin user navaneet@taskflow.com already exists. Updating password & role...');
      user.password = hashedPassword;
      user.role = 'SUPER_ADMIN';
      user.name = 'navaneet';
      user.organizationId = org._id;
      await user.save();
      console.log('User updated successfully.');
    } else {
      console.log('Creating Super Admin user navaneet@taskflow.com...');
      user = await User.create({
        name: 'navaneet',
        email: 'navaneet@taskflow.com',
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
