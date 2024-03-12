import mongoose, {Schema} from "mongoose";

const commentsSchema = new Schema({
    content: {
        type: string
    },
    video: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    onwer: {
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})

export const Comments = mongoose.model("Comments", commentsSchema);