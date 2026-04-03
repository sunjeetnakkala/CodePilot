DROP DATABASE IF EXISTS `codepilot`;
CREATE DATABASE `codepilot`;
USE `codepilot`;

CREATE TABLE `User` (
    `userID` INT AUTO_INCREMENT PRIMARY KEY,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('STUDENT','MANAGER') NOT NULL,
    `skillLevel` VARCHAR(50),
    `preferredLanguage` VARCHAR(50)
);

CREATE TABLE `LearningPath` (
    `pathID` INT AUTO_INCREMENT PRIMARY KEY,
    `pathName` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `difficulty` VARCHAR(50),
    `estimatedHours` INT
);

CREATE TABLE `KnowledgeBase` (
    `knowledgeBaseID` INT AUTO_INCREMENT PRIMARY KEY,
    `topic` VARCHAR(255) NOT NULL,
    `content` TEXT,
    `version` VARCHAR(50)
);

CREATE TABLE `Lesson` (
    `lessonID` INT AUTO_INCREMENT PRIMARY KEY,
    `pathID` INT NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` TEXT,
    FOREIGN KEY (`pathID`) REFERENCES `LearningPath`(`pathID`)
);

CREATE TABLE `UserEnrollment` (
    `enrollmentID` INT AUTO_INCREMENT PRIMARY KEY,
    `userID` INT NOT NULL,
    `pathID` INT NOT NULL,
    `pathName` VARCHAR(255),
    `enrollDate` DATE,
    `status` VARCHAR(50),
    FOREIGN KEY (`userID`) REFERENCES `User`(`userID`),
    FOREIGN KEY (`pathID`) REFERENCES `LearningPath`(`pathID`)
);

CREATE TABLE `AIChatSession` (
    `sessionID` INT AUTO_INCREMENT PRIMARY KEY,
    `userID` INT NOT NULL,
    `lessonID` INT NOT NULL,
    `knowledgeBaseID` INT NOT NULL,
    FOREIGN KEY (`userID`) REFERENCES `User`(`userID`),
    FOREIGN KEY (`lessonID`) REFERENCES `Lesson`(`lessonID`),
    FOREIGN KEY (`knowledgeBaseID`) REFERENCES `KnowledgeBase`(`knowledgeBaseID`)
);

CREATE TABLE `ContentFlag` (
    `flagID` INT AUTO_INCREMENT PRIMARY KEY,
    `userID` INT NOT NULL,
    `status` VARCHAR(50),
    `description` TEXT,
    FOREIGN KEY (`userID`) REFERENCES `User`(`userID`)
);

CREATE TABLE `ChatMessage` (
    `messageID` INT AUTO_INCREMENT PRIMARY KEY,
    `sessionID` INT NOT NULL,
    `senderRole` VARCHAR(50),
    `content` TEXT,
    `sentAt` DATETIME,
    FOREIGN KEY (`sessionID`) REFERENCES `AIChatSession`(`sessionID`)
);

CREATE TABLE `PracticeCodingChallenge` (
    `challengeID` INT AUTO_INCREMENT PRIMARY KEY,
    `lessonID` INT NOT NULL,
    `problem` TEXT,
    `starterCode` TEXT,
    `testCases` TEXT,
    `solution` TEXT,
    FOREIGN KEY (`lessonID`) REFERENCES `Lesson`(`lessonID`)
);

CREATE TABLE `Quiz` (
    `quizID` INT AUTO_INCREMENT PRIMARY KEY,
    `lessonID` INT NOT NULL,
    `questions` TEXT,
    `answers` TEXT,
    `timeSpent` INT,
    `score` INT,
    FOREIGN KEY (`lessonID`) REFERENCES `Lesson`(`lessonID`)
);

CREATE TABLE `ProgressRecord` (
    `progressRecordID` INT AUTO_INCREMENT PRIMARY KEY,
    `lessonID` INT NOT NULL,
    `userID` INT NOT NULL,
    `attempts` INT,
    `timeSpent` INT,
    `score` INT,
    FOREIGN KEY (`lessonID`) REFERENCES `Lesson`(`lessonID`),
    FOREIGN KEY (`userID`) REFERENCES `User`(`userID`)
);
