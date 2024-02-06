const calculateTotalPoints = (pointsByType) => {
    return pointsByType.posts.points +
           pointsByType.comments.points +
           pointsByType.upvote.points +
           pointsByType.reblog.points +
           pointsByType.login.points +
           pointsByType.delegation.points +
           pointsByType.community.points +
           pointsByType.checking.points;
  }

  module.exports = { calculateTotalPoints }