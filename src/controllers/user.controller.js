import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from '../models/user.model.js'
import { ApiError } from '../utils/ApiError.js'
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


const genrateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.genrateAccessToken()
        const refreshToken = await user.genrateRefreshToken()

        user.refershToken = refreshToken
        console.log("genrate5");
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while genrating referesh and access token");
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body

    if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "all field are required")
    }

    const exitingUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (exitingUser) {
        throw new ApiError(409, "Username or email already exits")
    }

    const avatarLocal = req.files?.avatar[0]?.path;
    // const coverImageLocal = req.files?.coverImage[0]?.path;

    let coverImageLocal;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocal = req.files.coverImage[0].path
    }

    if (!avatarLocal) {
        throw new ApiError(400, "Avatar file is missing in the request or not properly uploaded");
    }

    const avatar = await uploadOnCloudinary(avatarLocal);
    const coverImage = await uploadOnCloudinary(coverImageLocal);


    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(400, "Avatar file is required")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered suscessfully")
    )
    // step 1. => sending details of user
    // step 2. => checking user does not exits in db with the same username or email
    // step 3. => creating jwt using name, username, email, id
    // step 4. => encrypting the password to store it in the db using bycrpt
    // step 5. => sending back the response using Berrear jwt token for future login 
})

const loginUser = asyncHandler(async (req, res) => {
    // step 1. take input username, password, or email, password
    // step 2. check if the username or email exists on db and match password with db 
    // step 3. access and referesh token
    // step 4. send cookie

    const { email, username, password } = req.body


    if (!username || !email) {
        throw new ApiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User not registered")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(400, "Password is incorrect");
    }


    const { accessToken, refreshToken } = await genrateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const option = {
        httpOnly: true,
        secure: true
    }

    res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", refreshToken, option)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser, accessToken,
                    refreshToken
                }, "user logged In Successfully"
            )
        )


})

const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        })

    const option = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", option)
        .clearCookie("refreshToken", option)
        .json(
            new ApiResponse(200, "", "user loged out sucessfully")
        )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized refresh token")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refershToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const option = {
            httpOnly: true,
            secure: true
        }

        const { accessToken, newRefreshToken } = await genrateAccessTokenAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, option)
            .cookie("refreshToken", newRefreshToken, option)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken, refreshToken: newRefreshToken
                    },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }

})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?.id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Password changed")
        )
})

const getUser = asyncHandler(async (req, res) => {
    const user = req.user
    return res.status(200).json(
        new ApiResponse(200, user, "current user fetched successfully")
    )
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullname, email } = req.body

    if (!fullname || !email) {
        throw new ApiError(401, "fullname or email is required")
    }

    const user = await User.findOneAndUpdate(req.user?._id,
        {
            $set: { fullname, email }
        }, { new: true }).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details uploaded sucessfully"))
})

const updateUserAvatar = asyncHandler(async (req, res) => {
    const Localavatar = req.file?.path
    if (!Localavatar) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const newAvatar = await uploadOnCloudinary(Localavatar)


    const { avatar } = await User.findOne(req.user?._id);

    if (!avatar) {
        throw new ApiError(400, "User not exits");
    }


    if (!newAvatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    await User.findOneAndUpdate(req.user?._id, {
        $set: {
            avatar: avatar.url
        }
    }, { new: true }).select("-password")

    // deleteOnCloudinary(avatar);

    return res
        .status(200)
        .json(
            new ApiResponse(200, "Avatar updated successfully ")
        )
})

const updateCoverImage = asyncHandler(async (req, res) => {

    const localCoverImage = req.file?.path

    if (!localCoverImage) {
        throw new ApiError(400, "CoverImage file is missing")
    }

    const uploadCoverImage = await uploadOnCloudinary(localCoverImage);

    const { coverImage } = await User.findOne(req.user?._id);
    if (!uploadCoverImage) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    await User.findOneAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: uploadCoverImage
            }
        }, { new: true }
    ).select("-password")


    // deleteOnCloudinary(coverImage);

    return res
        .status(200)
        .json(
            new ApiResponse(200, "CoverImage updated successfully ")
        )
})

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        }, {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },

                channelSubscribedToCount: {
                    $size: "$subscribeTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }

            }
        }, {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    console.log(channel);
    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "User channel fetched successfully")
        )
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "video",
                localFiels: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: {
                                $project: {
                                    fullname: 1,
                                    username: 1,
                                    avatar: 1,
                                }
                            }
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        )
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getUser, updateAccountDetails, updateUserAvatar, updateCoverImage, getUserChannelProfile, getWatchHistory }