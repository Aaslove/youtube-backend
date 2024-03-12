import mongoose, {Schema, Types} from "mongoose";

const likeSchema = new Schema({
    comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    vider: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    }
},{timestamps: true});

export const Likes = mongoose.model("Likes", likeSchema);