require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/feature_flags';

const UserSchema = new mongoose.Schema({
  email:        { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, enum: ['admin','developer','viewer'], default: 'viewer' },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });

const FeatureFlagSchema = new mongoose.Schema({
  name:              { type: String, required: true, unique: true, trim: true, lowercase: true },
  description:       { type: String, default: '' },
  enabled:           { type: Boolean, default: false },
  rolloutPercentage: { type: Number, min: 0, max: 100, default: 0 },
  environment:       { type: String, enum: ['development','staging','production'], default: 'development' },
  version:           { type: Number, default: 1 },
  deletedAt:         { type: Date, default: null },
  createdBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const FeatureFlag = mongoose.model('FeatureFlag', FeatureFlagSchema);

const DEMO_FLAGS = [
  { name: 'feature-search-bar',        description: 'Search input in sidebar',         enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-trash-bin',          description: 'Deleted Notes link in sidebar',   enabled: true,  rolloutPercentage: 100 },
  { name: 'premium-cloud-sync',         description: 'Cloud Sync PRO button',           enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-export-pdf',         description: 'Export PDF button',               enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-share-notes',        description: 'Share Notes button',              enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-rich-text',          description: 'Rich text formatting toolbar',    enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-image-attachments',  description: 'Image attachment button',         enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-voice-notes',        description: 'Voice note recording button',     enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-categories-tags',    description: 'Category tags input',             enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-word-count',         description: 'Live word count indicator',       enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-auto-save',          description: 'Auto-save indicator',             enabled: true,  rolloutPercentage: 100 },
  { name: 'reminder-snooze-button',     description: 'Snooze button in reminder modal', enabled: true,  rolloutPercentage: 100 },
  { name: 'reminder-email-sync',        description: 'Send to Email in reminder modal', enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-pin-notes',          description: 'Pin icon on note cards',          enabled: true,  rolloutPercentage: 100 },
  { name: 'reminder-sound-alert',       description: 'Sound alert on reminder trigger', enabled: true,  rolloutPercentage: 100 },
  { name: 'theme-dark-mode',            description: 'Dark mode CSS theme',             enabled: false, rolloutPercentage: 0   },
  { name: 'ui-custom-fonts',            description: 'Inter custom font via Google',    enabled: false, rolloutPercentage: 0   },
  { name: 'ui-compact-view',            description: 'Compact spacing layout',          enabled: false, rolloutPercentage: 0   },
  { name: 'ui-animations',              description: 'CSS transition animations',       enabled: false, rolloutPercentage: 0   },
  { name: 'reminder-vibration',         description: 'Device vibration on reminder',    enabled: false, rolloutPercentage: 0   },
  { name: 'reminder-screen-flash',      description: 'Screen flash on reminder',        enabled: false, rolloutPercentage: 0   },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Upsert demo admin account (always ensures it exists with the right password)
  const passwordHash = await bcrypt.hash('demo1234', 12);
  const adminUser = await User.findOneAndUpdate(
    { email: 'admin@demo.com' },
    { email: 'admin@demo.com', passwordHash, role: 'admin', isActive: true },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  console.log('Admin user ready: admin@demo.com / demo1234');

  // Wipe existing flags and re-seed (idempotent)
  await FeatureFlag.deleteMany({});
  console.log('Cleared existing flags');

  const flags = DEMO_FLAGS.map(f => ({
    ...f,
    environment: 'development',
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  }));

  await FeatureFlag.insertMany(flags);
  console.log(`Seeded ${flags.length} feature flags`);

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
