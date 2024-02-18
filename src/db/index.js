import mongoose from "mongoose";
import { DB_NAME } from "../constant.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGOOSE_URI}/${DB_NAME}`)
        console.log(`\n MongoDB connected !! DB Host : ${connectionInstance.connection.host}`);

    } catch (error) {
        console.error("ERROR connection failed : ", error);
        process.exit(1)

    }
}

export default connectDB