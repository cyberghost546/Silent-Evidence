-- CreateIndex
CREATE FULLTEXT INDEX `Story_title_excerpt_content_idx` ON `Story`(`title`, `excerpt`, `content`);

-- CreateIndex
CREATE FULLTEXT INDEX `Story_title_idx` ON `Story`(`title`);

-- CreateIndex
CREATE FULLTEXT INDEX `StoryChapter_title_content_idx` ON `StoryChapter`(`title`, `content`);
