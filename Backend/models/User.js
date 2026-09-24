const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const tenantPlugin = require('../utils/tenantPlugin');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'User name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false
    },
    role: {
      type: String,
      enum: ['ADMIN', 'MANAGER', 'USER'],
      default: 'USER'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tokenVersion: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Apply Tenant Plugin
userSchema.plugin(tenantPlugin);

// Unique compound index: tenantId + email
userSchema.index({ tenantId: 1, email: 1 }, { unique: true });
// Index for sorting users by tenant
userSchema.index({ tenantId: 1, createdAt: -1 });

// Pre-save hook to hash password with bcrypt (12 rounds)
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Remove sensitive fields when converting to JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);
