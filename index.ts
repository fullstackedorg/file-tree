import "./file-tree.css";

type Path = {
    isDirectory: boolean;
    components: string[];
    equals: (path: Path) => boolean;
    isParentOf: (path: Path) => boolean;
    isChildOf: (path: Path) => boolean;
    isDirectParentOf: (path: Path) => boolean;
    isDirectChildOf: (path: Path) => boolean;
    hasSameParentAs: (path: Path) => boolean;
    goesAfter: (path: Path) => boolean;
    createChildPath: typeof createPath;
    toString: () => string;
};

function arrEqual<T>(arr1: T[], arr2: T[]) {
    if (arr1.length !== arr2.length) {
        return false;
    }

    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }

    return true;
}

function isPathParentOfPath(parent: Path, child: Path) {
    if (parent.components.length >= child.components.length) {
        return false;
    }

    return arrEqual(
        parent.components,
        child.components.slice(0, parent.components.length),
    );
}

function isPathDirectParentOfPath(parent: Path, child: Path) {
    if (child.components.length - parent.components.length !== 1) {
        return false;
    }

    return arrEqual(parent.components, child.components.slice(0, -1));
}

function sortPaths(path1: Path, path2: Path) {
    if (path1.hasSameParentAs(path2)) {
        if (path1.isDirectory && !path2.isDirectory) {
            return -1;
        } else if (!path1.isDirectory && path2.isDirectory) {
            return 1;
        }
    }

    return path1.toString() < path2.toString() ? -1 : 1;
}

function createPath(pathStr: string, isDirectory: boolean): Path {
    return createPathWithComponents(pathStr.split("/"), isDirectory);
}

function createPathWithComponents(
    components: string[],
    isDirectory: boolean,
): Path {
    const p: Path = {
        isDirectory,
        components,
        equals: (path) => arrEqual(components, path.components),
        isParentOf: (path) => isPathParentOfPath(p, path),
        isChildOf: (path) => isPathParentOfPath(path, p),
        isDirectParentOf: (path) => isPathDirectParentOfPath(p, path),
        isDirectChildOf: (path) => isPathDirectParentOfPath(path, p),
        hasSameParentAs: (path) =>
            arrEqual(components.slice(0, -1), path.components.slice(0, -1)),
        goesAfter: (path) => sortPaths(p, path) === 1,
        createChildPath: (name, isDirectory) =>
            createPathWithComponents([...components, name], isDirectory),
        toString: () => components.join("/"),
    };
    return p;
}

type FileItem = {
    path: Path;
    element: HTMLDivElement;
    refresh: (fileItem: FileItem) => void;
    insertAfter: (fileItem: FileItem) => void;
};

function createFileItem(path: Path): FileItem {
    let element = createFileItemElement(path, null);
    const f: FileItem = {
        path,
        get element() {
            return element;
        },
        refresh: () => {
            const updatedElement = createFileItemElement(path, null);
            element.replaceWith(updatedElement);
            element = updatedElement;
        },
        insertAfter: (fileItem) =>
            element.insertAdjacentElement("afterend", fileItem.element),
    };
    return f;
}

type RawFileItem = { name: string; isDirectory: boolean };

type CreateFileTreeOpts = {
    readDirectory: (path: string) => RawFileItem[] | Promise<RawFileItem[]>;
    itemHeight?: number;
    indentWidth?: number;
    directoryIcons?: {
        open: HTMLElement;
        close: HTMLElement;
    };
    actionSuffix?: (fileItem: FileItem) => HTMLElement;
    iconPrefix?: (fileItem: FileItem) => HTMLElement;
    onSelect?: (fileItem: FileItem) => void;
};

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
        path: Path;
    };
    const setActive = (path?: Path) => {
        path = path || lastActive.path;
        const indexOf = flatFileList.findIndex((i) => i.path.equals(path));

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

        opts.onSelect?.(flatFileList[indexOf]);
    };

    const renderDirectoryIcon = (fileItem: FileItemDirectory) => {
        const iconContainer = document.createElement("div");
        iconContainer.classList.add("icon");
        const icon = openedDirectory.has(fileItem.path.toString())
            ? opts.directoryIcons?.open?.cloneNode(true) || "V"
            : opts.directoryIcons?.close?.cloneNode(true) || ">";
        iconContainer.append(icon);
        return iconContainer;
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

    const openDirectory = async (path: Path, render = true) => {
        openedDirectory.add(path.toString());
        const indexOfDirectory = flatFileList.findIndex((fileItem) =>
            fileItem.path.equals(path),
        );

        let contentRaw: RawFileItem[];
        const directoryRead = opts.readDirectory(path.toString());
        if (directoryRead instanceof Promise) {
            contentRaw = await directoryRead;
        } else {
            contentRaw = directoryRead;
        }

        const fileItems: FileItem[] = contentRaw.map(({ isDirectory, name }) =>
            createFileItem(
                isDirectory ? "directory" : "file",
                path.createChildPath(name),
            ),
        );

        for (let i = 0; i < content.length; i++) {
            const item = content[i];
            const itemPath = path.createChildPath(item.name);

            flatFileList.splice(indexOfDirectory + 1, 0, {
                type: item.isDirectory ? "directory" : "file",
                path: itemPath,
            });

            if (item.isDirectory) {
                if (openedDirectory.has(itemPath.toString())) {
                    await openDirectory(itemPath, false);
                }
            }
        }

        if (render) {
            renderList();
        }
    };

    const closeDirectory = (path: Path, removeSelf = false) => {
        openedDirectory.delete(path.toString());

        if (removeSelf) {
            // close all opened sub directory
            for (const d of openedDirectory) {
                if (path.isParentOf(createPath(d))) {
                    openedDirectory.delete(d);
                }
            }
        }

        const predicate = removeSelf
            ? (item: FileItem) =>
                  !item.path.isChildOf(path) && !item.path.equals(path)
            : (item: FileItem) => !item.path.isChildOf(path);

        const removed = filterInPlace(flatFileList, predicate);
        removed.forEach((i) => i.element?.remove());
        renderList();
    };

    const addItem = (pathStr: string) => {
        const path = createPath(pathStr);
    };

    const removeItem = (pathStr: string) =>
        closeDirectory(createPath(pathStr), true);

    openDirectory(createPath(""));

    return {
        container,
        addItem,
        removeItem,
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

type FileItemElementOpts = {
    itemHeight: number;
    indentWidth: number;
    iconPrefix?: HTMLElement;
    onClick?: (path: Path) => void;
};

function createFileItemElement(path: Path, opts: FileItemElementOpts) {
    const depth = path.components.length - 2;
    const element = document.createElement("div");
    element.classList.add("file-item");

    element.style.height = opts.itemHeight + "px";

    element.append(
        ...new Array(depth).fill(null).map(() => {
            const indentSpace = document.createElement("div");
            indentSpace.style.width = opts.indentWidth + "px";
            indentSpace.style.minWidth = opts.indentWidth + "px";
            indentSpace.classList.add("indent");
            const line = document.createElement("div");
            indentSpace.append(line);
            return indentSpace;
        }),
    );

    if (!path.isDirectory && opts.iconPrefix) {
        const iconContainer = document.createElement("div");
        iconContainer.classList.add("icon");
        const icon = opts.iconPrefix(fileItem);
        iconContainer.append(icon);
        fileItem.element.append(iconContainer);
    } else if (fileItem.type === "directory") {
        fileItem.element.append(renderDirectoryIcon(fileItem));
    }

    const name = document.createElement("div");
    name.innerText = fileItem.path.components.at(-1);
    fileItem.element.append(name);

    fileItem.element.onclick = () => {
        if (fileItem.type === "directory") {
            if (openedDirectory.has(fileItem.path.toString())) {
                closeDirectory(fileItem.path);
            } else {
                openDirectory(fileItem.path);
            }
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

    return element;
}
