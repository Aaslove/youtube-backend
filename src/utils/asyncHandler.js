const asyncHandler = (resolveHandler) => {
    (req, res, next) => {
        Promise.resolve(resolveHandler(req, res, next))
            .catch((err) => next(err))
    }
}

export { asyncHandler }


// const asyncHandler = (fn) => {
//     async (req, res, next) => {
//         try {
//             await fn(res, req, next);
//         } catch (error) {
//             res.status(err.code || 500).json({
//                 success: false,
//                 message: err.message
//             })
//         }
//     }
// }