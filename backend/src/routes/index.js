const express = require("express");
const authRoutes = require("./auth.routes");
const coursesRoutes = require("./courses.routes");
const meetingsRoutes = require("./meetings.routes");
const testsRoutes = require("./tests.routes");
const gradesRoutes = require("./grades.routes");
const budgetRoutes = require("./budget.routes");
const tasksRoutes = require("./tasks.routes");
const usersRoutes = require("./users.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/courses", coursesRoutes);
router.use("/meetings", meetingsRoutes);
router.use("/tests", testsRoutes);
router.use("/grades", gradesRoutes);
router.use("/budget", budgetRoutes);
router.use("/", tasksRoutes);
router.use("/", usersRoutes);

module.exports = router;
