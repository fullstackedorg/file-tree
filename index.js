import { createFileTree } from ".";
import { faker } from "@faker-js/faker";
import eruda from "eruda";
eruda.init();

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function randomFileItem() {
    const isFile = Math.random() >= 0.5;
    return {
        name: isFile
            ? faker.system.commonFileName()
            : faker.string.alpha({ length: { min: 4, max: 12 } }),
        isDirectory: !isFile,
    };
}

function fakeDirectoryContent() {
    const itemsCount = randomIntFromInterval(1, 10);
    return new Array(itemsCount).fill(null).map(randomFileItem);
}

const cache = {};
const iconCache = {};

const directoryIconOpen = document.createElement("div");
directoryIconOpen.innerText = "🔽"
const directoryIconClose = document.createElement("div");
directoryIconClose.innerText = "▶️"

const { container } = createFileTree({
    readDirectory: async (path) => {
        let content = cache[path];
        if (!content) {
            content = fakeDirectoryContent();
            cache[path] = content;
        }
        return content;
    },
    directoryIcons: {
        open: directoryIconOpen,
        close: directoryIconClose,
    },
    iconPrefix: (fileItem) => {
        let imgSrc = iconCache[fileItem.path];
        if (!imgSrc) {
            imgSrc = faker.image.avatar();
            iconCache[fileItem.path] = imgSrc;
        }
        const img = document.createElement("img");
        img.src = imgSrc;
        return img;
    },
    actionSuffix: (fileItem) => {
        const div = document.createElement("div");
        div.innerText = "···"
        return div
    }
});

document.body.append(container);
