CREATE TABLE `vocalRecordings` (
	`id` varchar(64) NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`part` enum('A','B') NOT NULL,
	`attemptNumber` int NOT NULL DEFAULT 1,
	`storageKey` varchar(512),
	`storageUrl` text,
	`mimeType` varchar(128) NOT NULL,
	`durationSeconds` int NOT NULL DEFAULT 0,
	`transcript` text,
	`metrics` json,
	`score` int,
	`reliability` int,
	`feedback` text,
	`wordDifferences` json,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vocalRecordings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vocalSessions` (
	`id` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`exerciseId` int NOT NULL,
	`dayId` varchar(24) NOT NULL,
	`levelId` varchar(24) NOT NULL,
	`status` enum('partial','complete') NOT NULL DEFAULT 'partial',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vocalSessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `vocalRecordings` ADD CONSTRAINT `vocalRecordings_sessionId_vocalSessions_id_fk` FOREIGN KEY (`sessionId`) REFERENCES `vocalSessions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vocalSessions` ADD CONSTRAINT `vocalSessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;