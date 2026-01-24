import mongoose from "mongoose";

const escrowSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    budget: {
      type: Number,
      required: [true, "Budget is required"],
      min: [0, "Budget cannot be negative"],
    },
    milestones: [
      {
        id: {
          type: Number,
          required: true,
        },
        title: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          required: true,
          trim: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        status: {
          type: String,
          enum: ["pending", "in_progress", "completed", "disputed"],
          default: "pending",
        },
        completedAt: {
          type: Date,
        },
      },
    ],
    status: {
      type: String,
      enum: ["draft", "active", "completed", "cancelled", "disputed"],
      default: "draft",
    },
    createdBy: {
      type: String, // Could be mongoose.Schema.Types.ObjectId if you have user auth
      required: false,
    },
    freelancer: {
      type: String, // Could be mongoose.Schema.Types.ObjectId if you have user auth
      required: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Indexes for better query performance
escrowSchema.index({ status: 1, createdAt: -1 });
escrowSchema.index({ createdBy: 1 });

const Escrow = mongoose.model("Escrow", escrowSchema);

export default Escrow;
