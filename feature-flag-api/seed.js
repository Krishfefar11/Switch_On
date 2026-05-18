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
  // ── Always-visible sections (toggle OFF to remove entire page sections)
  { name: 'feature-hero-banner',      description: 'Mega sale hero banner at the top of the page. Removing this simulates killing a marketing campaign without a redeploy.', enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-flash-deal',       description: 'Flash deals strip with live countdown timer. Shows time-limited offers. Off = deal section disappears instantly.',        enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-promo-banner',     description: 'Top promotional banner with discount code (SHOPON20). Toggle to run or pause a promo campaign in real time.',            enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-recommendations',  description: 'AI-powered "Recommended for You" product row. Off = personalisation engine disabled, users see only main grid.',         enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-reviews',          description: 'Customer reviews section at the bottom of the page. Toggle to A/B test whether reviews increase conversion.',            enabled: true,  rolloutPercentage: 100 },

  // ── Per-product-card features (toggle changes every card simultaneously)
  { name: 'feature-buy-now',          description: 'Buy Now button on every product card alongside Add to Cart. Off = single CTA only. Classic A/B test for conversion rate.', enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-emi-options',      description: 'EMI / instalment pricing shown on eligible products (e.g. "from $83/mo"). Off = price-sensitive feature hidden.',          enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-free-delivery',    description: 'Free Delivery badge on all product cards. Off = delivery messaging removed. Test whether it affects add-to-cart rate.',    enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-wishlist',         description: 'Wishlist heart button on product cards and wishlist count in navbar. Off = save-for-later feature fully hidden.',          enabled: true,  rolloutPercentage: 100 },

  // ── Navbar features
  { name: 'feature-search-bar',       description: 'Search bar in the top navigation. Off = search removed, users browse by category only.',                                  enabled: true,  rolloutPercentage: 100 },
  { name: 'feature-loyalty-points',   description: 'Loyalty points badge in the navbar showing user point balance. Off = rewards programme UI hidden (e.g. during maintenance).', enabled: true, rolloutPercentage: 100 },

  // ── Theme / UI
  { name: 'theme-dark-mode',          description: 'Dark colour theme across the entire app. Toggle for instant whole-page visual switch — no reload required.',              enabled: false, rolloutPercentage: 0   },
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
