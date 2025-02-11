import "./file-tree.css";

type CreateFileTreeOpts = {
    readDirectory: (path: string) => { name: string; isDirectory: boolean }[];
    itemHeight?: number;
    indentWidth?: number;
    directoryIcons?: {
        open: HTMLElement;
        close: HTMLElement;
    };
    actionSuffix?: (fileItem: FileItem) => HTMLElement;
    iconPrefix?: (fileItem: FileItem) => HTMLElement;
};

type FileItemCommon = {
    path: string;
    element?: HTMLElement;
};

type FileItemDirectory = FileItemCommon & {
    type: "directory";
    opened: boolean;
};

type FileItemFile = FileItemCommon & {
    type: "file";
};

type FileItem = FileItemDirectory | FileItemFile;

export function createFileTree(opts: CreateFileTreeOpts) {
    const container = document.createElement("div");
    container.classList.add("file-tree");

    const itemHeight = opts.itemHeight || 25;
    const indentWidth = opts.indentWidth || 20;

    const scrollable = document.createElement("div");
    scrollable.classList.add("scrollable");
    container.append(scrollable);

    const fileItems = document.createElement("div");
    fileItems.classList.add("file-items");
    scrollable.append(fileItems);

    const flatFileList: FileItem[] = [];
    const openedDirectory = new Set<string>();

    let lastActive: {
        element: HTMLElement;
        action?: HTMLElement;
        path: string;
    };
    const setActive = (path?: string) => {
        path = path || lastActive.path;
        const indexOf = flatFileList.findIndex((i) => i.path === path);

        const element = lastActive?.element || document.createElement("div");
        element.classList.add("active");
        element.style.top = itemHeight * indexOf + "px";
        element.style.height = itemHeight + "px";

        let action: HTMLElement;
        if (opts.actionSuffix) {
            action = document.createElement("div");
            action.classList.add("action");
            action.append(opts.actionSuffix(flatFileList.at(indexOf)));

            if (lastActive?.action) {
                lastActive.action.replaceWith(action);
            } else {
                element.append(action);
            }
        }

        if (!lastActive?.element) {
            fileItems.append(element);
        }

        lastActive = {
            element,
            action,
            path,
        };
    };

    const renderDirectoryIcon = (fileItem: FileItemDirectory) => {
        const iconContainer = document.createElement("div");
        iconContainer.classList.add("icon");
        const icon = fileItem.opened
            ? opts.directoryIcons?.open?.cloneNode(true) || ">"
            : opts.directoryIcons?.close?.cloneNode(true) || "V";
        iconContainer.append(icon);
        return iconContainer;
    };

    const createItemElements = (fileItem: FileItem) => {
        const depth = fileItem.path.split("/").length - 2;
        fileItem.element = document.createElement("div");
        fileItem.element.classList.add("file-item");

        fileItem.element.style.height = itemHeight + "px";

        fileItem.element.append(
            ...new Array(depth).fill(null).map(() => {
                const indentSpace = document.createElement("div");
                indentSpace.style.width = indentWidth + "px";
                indentSpace.style.minWidth = indentWidth + "px";
                indentSpace.classList.add("indent");
                const line = document.createElement("div");
                indentSpace.append(line);
                return indentSpace;
            }),
        );

        if (fileItem.type === "file" && opts.iconPrefix) {
            const iconContainer = document.createElement("div");
            iconContainer.classList.add("icon");
            const icon = opts.iconPrefix(fileItem);
            iconContainer.append(icon);
            fileItem.element.append(iconContainer);
        } else if (fileItem.type === "directory") {
            fileItem.element.append(renderDirectoryIcon(fileItem));
        }

        const name = document.createElement("div");
        name.innerText = fileItem.path.split("/").pop();
        fileItem.element.append(name);

        fileItem.element.onclick = () => {
            if (fileItem.type === "directory") {
                if (fileItem.opened) {
                    closeDirectory(fileItem.path);
                } else {
                    openDirectory(fileItem.path);
                }
                fileItem.opened = !fileItem.opened;
                fileItem.element
                    .querySelector(".icon")
                    .replaceWith(renderDirectoryIcon(fileItem));
            }
            setActive(fileItem.path);
        };

        if (opts.actionSuffix) {
            const action = document.createElement("div");
            action.classList.add("action");
            action.append(opts.actionSuffix(fileItem));
            fileItem.element.append(action);
        }
    };

    const renderList = () => {
        let lastSeenElement: HTMLElement = null;
        for (let i = 0; i < flatFileList.length; i++) {
            const fileItem = flatFileList[i];

            if (!fileItem.element) {
                createItemElements(fileItem);
                if (lastSeenElement) {
                    lastSeenElement.insertAdjacentElement(
                        "afterend",
                        fileItem.element,
                    );
                } else {
                    fileItems.append(fileItem.element);
                }
            }

            lastSeenElement = fileItem.element;
        }
    };

    const openDirectory = (path: string, rerender = true) => {
        openedDirectory.add(path);
        const indexOfDirectory = flatFileList.findIndex((i) => i.path === path);
        const openedSubDirectories = new Set<string>();
        const content: FileItem[] = opts
            .readDirectory(path)
            .sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) {
                    return -1;
                } else if (!a.isDirectory && b.isDirectory) {
                    return 1;
                } else {
                    return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
                }
            })
            .map((i) => {
                const itemPath = path + "/" + i.name;
                if (i.isDirectory) {
                    if (openedDirectory.has(itemPath)) {
                        openedSubDirectories.add(itemPath);
                    }

                    return {
                        path: itemPath,
                        type: "directory",
                        opened: openedDirectory.has(itemPath),
                    };
                } else {
                    return {
                        path: itemPath,
                        type: "file",
                    };
                }
            });
        flatFileList.splice(indexOfDirectory + 1, 0, ...content);
        openedSubDirectories.forEach((d) => openDirectory(d, false));
        if (rerender) {
            renderList();
        }
    };

    const closeDirectory = (path: string) => {
        openedDirectory.delete(path);
        const removed = filterInPlace(
            flatFileList,
            (i) => !i.path.startsWith(path) || i.path.length <= path.length,
        );
        removed.forEach((i) => i.element?.remove());
        renderList();
    };

    openDirectory("");

    return {
        container,
    };
}

function filterInPlace<T>(
    a: T[],
    condition: (v: T, i: number, arr: T[]) => boolean,
): T[] {
    let i = 0,
        j = 0;

    const r: T[] = [];
    while (i < a.length) {
        const val = a[i];
        if (condition(val, i, a)) {
            a[j++] = val;
        } else {
            r.push(val);
        }
        i++;
    }

    a.length = j;

    return r;
}
