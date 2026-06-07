require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/feature_flags';

const FeatureFlagSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  description:       { type: String, default: '' },
  enabled:           { type: Boolean, default: false },
  rolloutPercentage: { type: Number, default: 0 },
  environment:       { type: String, default: 'development' },
  version:           { type: Number, default: 1 },
  deletedAt:         { type: Date, default: null },
  createdBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const FeatureFlag = mongoose.model('FeatureFlag', FeatureFlagSchema);

async function seedProduction() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Get all development flags
  const devFlags = await FeatureFlag.find({ environment: 'development', deletedAt: null }).lean();

  if (devFlags.length === 0) {
    console.log('No development flags found. Run seed.js first.');
    process.exit(1);
  }

  // Delete existing production flags
  await FeatureFlag.deleteMany({ environment: 'production' });
  console.log('Cleared existing production flags');

  // Copy them as production flags
  const prodFlags = devFlags.map(f => ({
    name:              f.name,
    description:       f.description,
    enabled:           f.enabled,
    rolloutPercentage: f.rolloutPercentage,
    environment:       'production',
    version:           f.version || 1,
    deletedAt:         null,
    createdBy:         f.createdBy,
    updatedBy:         f.updatedBy,
  }));

  await FeatureFlag.insertMany(prodFlags);
  console.log(`Seeded ${prodFlags.length} production flags`);

  await mongoose.disconnect();
  console.log('Done.');
}

seedProduction().catch(err => {
  console.error(err);
  process.exit(1);
});
