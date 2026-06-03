const mongoose = require('mongoose');
const slugify = require('slugify');

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A photography package must have a name'],
      unique: true,
      trim: true,
      maxlength: [50, 'A package name must have less or equal to 50 characters']
    },
    slug: String,
    price: {
      type: Number,
      required: [true, 'A package must have a price']
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A package must have a summary description']
    },
    description: {
      type: String,
      trim: true
    },
    features: [String], // Array to list package inclusions (e.g., Drone, Album, 2 Photographers)
    imageCover: {
      type: String,
      required: [true, 'A package must have a cover image']
    },
    images: [String], // Array of gallery images for the package
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// DOCUMENT MIDDLEWARE: Create a slug for clean URLs before saving
packageSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

const Package = mongoose.model('Package', packageSchema);

module.exports = Package;