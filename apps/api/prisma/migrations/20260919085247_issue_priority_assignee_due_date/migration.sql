-- AlterTable
ALTER TABLE `issue` ADD COLUMN `assignedById` VARCHAR(191) NULL,
    ADD COLUMN `assigneeId` VARCHAR(191) NULL,
    ADD COLUMN `dueDate` DATE NULL,
    ADD COLUMN `priority` ENUM('NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE INDEX `Issue_assigneeId_idx` ON `Issue`(`assigneeId`);

-- CreateIndex
CREATE INDEX `Issue_assignedById_idx` ON `Issue`(`assignedById`);

-- AddForeignKey
ALTER TABLE `Issue` ADD CONSTRAINT `Issue_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Issue` ADD CONSTRAINT `Issue_assignedById_fkey` FOREIGN KEY (`assignedById`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
