import mongoose from 'mongoose';

const callSchema = new mongoose.Schema({
  callId: {
    type: String,
    required: true,
    unique: true, // Ensures we don't save the same call twice
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['queued', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer'],
    default: 'queued',
  },
  transcript: {
    type: String,
    default: '',
  },
  recordingUrl: {
    type: String,
    default: null,
  },
  duration: {
    type: Number, // In seconds
    default: 0,
  },
  analysis: {
    type: mongoose.Schema.Types.Mixed, // Flexible field for any AI analysis results
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Call = mongoose.model('Call', callSchema);

export default Call;