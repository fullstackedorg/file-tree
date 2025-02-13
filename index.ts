import "./file-tree.css";

type Path = {
    isDirectory: boolean;
    components: string[];
    parent: Path;
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

    return path1.toString().toLowerCase() < path2.toString().toLowerCase()
        ? -1
        : 1;
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
        get parent() {
            return components.length === 1
                ? null
                : createPathWithComponents(components.slice(0, -1), true);
        },
        equals: (path) => arrEqual(components, path.components),
        isParentOf: (path) => isPathParentOfPath(p, path),
        isChildOf: (path) => isPathParentOfPath(path, p),
        isDirectParentOf: (path) => isPathDirectParentOfPath(p, path),
        isDirectChildOf: (path) => isPathDirectParentOfPath(path, p),
        hasSameParentAs: (path) =>
            arrEqual(p.parent?.components ?? [], path.parent?.components ?? []),
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
    refresh: () => void;
    insertBefore: (fileItem: FileItem) => void;
    insertAfter: (fileItem: FileItem) => void;
};

function createFileItem(path: Path, opts: RenderOpts): FileItem {
    let element = createFileItemElement(path, opts);
    const f: FileItem = {
        path,
        get element() {
            return element;
        },
        refresh: () => {
            const updatedElement = createFileItemElement(path, opts);
            element.replaceWith(updatedElement);
            element = updatedElement;
        },
        insertBefore: (fileItem) =>
            element.insertAdjacentElement("beforebegin", fileItem.element),
        insertAfter: (fileItem) =>
            element.insertAdjacentElement("afterend", fileItem.element),
    };
    return f;
}

type RenderOpts = {
    container: HTMLElement;
    itemHeight: number;
    indentWidth: number;
    isActive: (path: Path) => boolean;
    name: (name: string) => HTMLElement | string;
    prefix: (path: Path) => HTMLElement;
    suffix: (path: Path) => HTMLElement;
    classes: (path: Path) => string[];
    onClick: (path: Path, e: MouseEvent) => void;
};

function createRenderer(opts: RenderOpts) {
    const flatList: FileItem[] = [];

    const addRootPath = (path: Path) => {
        const fileItem = createFileItem(path, opts);

        // first element
        if (flatList.length === 0) {
            opts.container.append(fileItem.element);
            flatList.push(fileItem);
            return;
        }
        // at start
        else if (flatList.at(0).path.goesAfter(path)) {
            opts.container.prepend(fileItem.element);
            flatList.unshift(fileItem);
            return;
        }
        // at end
        else if (path.goesAfter(flatList.at(-1).path)) {
            opts.container.append(fileItem.element);
            flatList.push(fileItem);
            return;
        }

        // in the middle
        for (let i = 0; i < flatList.length; i++) {
            if (flatList[i].path.components.length !== 1) continue;

            if (!path.goesAfter(flatList[i].path)) {
                flatList[i].insertBefore(fileItem);
                flatList.splice(i, 0, fileItem);
                return;
            }
        }
    };

    const r = {
        isDisplayed: (path: Path) => {
            return !!flatList.find((fileItem) => fileItem.path.equals(path));
        },
        addPath: (path: Path) => {
            const exists = flatList.find((fileItem) =>
                fileItem.path.equals(path),
            );
            if (exists) {
                return;
            }

            if (path.components.length === 1) {
                return addRootPath(path);
            }

            const indexOfDirectParent = flatList.findIndex((fileItem) =>
                fileItem.path.isDirectParentOf(path),
            );

            // parent isn't open so dont bother going any further
            if (indexOfDirectParent === -1) {
                return;
            }

            const parentFileItem = flatList[indexOfDirectParent];

            const fileItem = createFileItem(path, opts);

            for (let i = indexOfDirectParent + 1; i < flatList.length; i++) {
                if (
                    (!path.goesAfter(flatList[i].path) &&
                        path.hasSameParentAs(flatList[i].path)) ||
                    (!path.hasSameParentAs(flatList[i].path) &&
                        !flatList[i].path.isChildOf(parentFileItem.path))
                ) {
                    flatList[i].insertBefore(fileItem);
                    flatList.splice(i, 0, fileItem);
                    return;
                }
            }

            // reached end
            opts.container.append(fileItem.element);
            flatList.push(fileItem);
        },
        removePath: (path: Path) => {
            const indexOfFileItem = flatList.findIndex((fileItem) =>
                fileItem.path.equals(path),
            );
            if (indexOfFileItem === -1) {
                return [];
            }

            const childPathRemoved: Path[] = flatList[indexOfFileItem].path
                .isDirectory
                ? r.removeChildPath(path)
                : [];

            flatList[indexOfFileItem].element.remove();
            flatList.splice(indexOfFileItem, 1);

            return childPathRemoved;
        },
        removeChildPath: (path: Path) => {
            const removed = filterInPlace(
                flatList,
                (fileItem) => !fileItem.path.isChildOf(path),
            );
            removed.forEach((fileItem) => fileItem.element.remove());
            return removed.map((item) => item.path);
        },
        addPaths: (paths: Path[]) => {
            paths.forEach(r.addPath);
        },
        refreshPath: (path: Path) => {
            const fileItem = flatList.find((f) => f.path.equals(path));
            fileItem?.refresh();
        },
    };
    return r;
}

type RawFileItem = { name: string; isDirectory: boolean };

type CreateFileTreeOpts = {
    readDirectory: (pathStr: string) => RawFileItem[] | Promise<RawFileItem[]>;
    isDirectory: (pathStr: string) => boolean | Promise<boolean>;
    itemHeight?: number;
    indentWidth?: number;
    directoryIcons?: {
        open: HTMLElement;
        close: HTMLElement;
    };
    name?: (suggestedName: string) => HTMLElement;
    suffix?: (pathStr: string) => HTMLElement;
    prefix?: (pathStr: string) => HTMLElement;
    classes?: (pathStr: string) => string[];
    onSelect?: (pathStr: string) => void;
};

function defaultDirectoryIcon(open: boolean) {
    const div = document.createElement("div");
    div.innerText = open ? "V" : ">";
    return div;
}

type ClickEventInfo = {
    metaKey: boolean;
    shiftKey: boolean;
};

function asyncify<T extends (...params: any[]) => ReturnType<T>>(
    fn: T,
): (...params: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
    const asynced = async (...params: Parameters<T>) => {
        const returnedValue = fn(...params);
        if (returnedValue instanceof Promise) {
            return await returnedValue;
        }
        return returnedValue;
    };

    return asynced as any;
}

export function createFileTree(opts: CreateFileTreeOpts) {
    const readDirectory = asyncify(opts.readDirectory);
    const isDirectory = asyncify(opts.isDirectory);

    const openedDirectory = new Set<string>();
    const activePaths = new Set<string>();

    window.addEventListener("click", () => removeActive());

    const container = document.createElement("div");
    container.classList.add("file-tree");

    const scrollable = document.createElement("div");
    scrollable.classList.add("scrollable");
    container.append(scrollable);

    const fileItems = document.createElement("div");
    fileItems.classList.add("file-items");
    scrollable.append(fileItems);

    const directoryIcons = {
        open: opts.directoryIcons?.open || defaultDirectoryIcon(true),
        close: opts.directoryIcons?.close || defaultDirectoryIcon(false),
    };

    const createDirectoryIcon = (path: Path) => {
        const icon = openedDirectory.has(path.toString())
            ? directoryIcons.open
            : directoryIcons.close;
        return icon.cloneNode(true) as HTMLElement;
    };

    const toggleDirectory = (path: Path) => {
        if (openedDirectory.has(path.toString())) {
            closeDirectory(path);
        } else {
            openDirectory(path);
        }
    };

    const toggleActive = (path: Path, e: ClickEventInfo) => {
        if (e.metaKey && activePaths.has(path.toString())) {
            removeActive(path);
        } else {
            addActive(path, e);
        }
    };

    const renderOpts: RenderOpts = {
        container: fileItems,
        itemHeight: opts.itemHeight || 25,
        indentWidth: opts.indentWidth || 20,
        isActive: (path) => activePaths.has(path.toString()),
        name: (name) => opts.name?.(name) || name,
        prefix: (path) => {
            if (path.isDirectory) return createDirectoryIcon(path);
            return opts.prefix?.(path.toString());
        },
        suffix: (path) => opts.suffix?.(path.toString()),
        classes: (path) => opts.classes?.(path.toString()),
        onClick: (path, e) => {
            if (path.isDirectory && !e.metaKey) {
                toggleDirectory(path);
            }
            toggleActive(path, {
                metaKey: e.metaKey || e.ctrlKey,
                shiftKey: e.shiftKey,
            });
        },
    };

    const r = createRenderer(renderOpts);

    const addActive = (path: Path, e: ClickEventInfo) => {
        if (!e.metaKey) {
            removeActive();
        }

        activePaths.add(path.toString());
        r.refreshPath(path);
        opts.onSelect?.(path.toString());
    };

    const removeActive = (path?: Path) => {
        if (path) {
            activePaths.delete(path.toString());
            r.refreshPath(path);
        } else {
            const copy = Array.from(activePaths);
            activePaths.clear();
            copy.forEach((p) => r.refreshPath(createPath(p, null)));
        }
    };

    const openDirectory = async (path: Path, render = true) => {
        openedDirectory.add(path.toString());

        const contentRaw = await readDirectory(path.toString());

        const childPaths: Path[] = contentRaw.map(({ isDirectory, name }) =>
            path.createChildPath(name, isDirectory),
        );

        const openSubDirectoryPromises = childPaths
            .filter((childPath) => openedDirectory.has(childPath.toString()))
            .map((childPath) => openDirectory(childPath, false));

        const subDirectoryPaths = (
            await Promise.all(openSubDirectoryPromises)
        ).flat();

        childPaths.push(...subDirectoryPaths);

        if (render) {
            r.addPaths(childPaths);
            r.refreshPath(path);
        } else {
            return childPaths;
        }
    };

    const closeDirectory = (path: Path) => {
        openedDirectory.delete(path.toString());
        r.removeChildPath(path);
        r.refreshPath(path);
    };

    const addItem = async (pathStr: string) => {
        let path = createPath(pathStr, null);
        const parent = path.parent;
        if (
            !parent ||
            (r.isDisplayed(parent) && openedDirectory.has(parent.toString()))
        ) {
            path = createPath(pathStr, await isDirectory(pathStr));
            r.addPath(path);
        }

        path = parent;
        while (path) {
            const parent = path.parent;
            if (
                !parent ||
                (r.isDisplayed(parent) &&
                    openedDirectory.has(parent.toString()))
            ) {
                r.addPath(path);
            }
            path = parent;
        }
    };

    const removeItem = (pathStr: string) => {
        openedDirectory.delete(pathStr);
        if (activePaths.has(pathStr)) {
            removeActive(createPath(pathStr, null));
        }
        r.removePath(createPath(pathStr, null)).forEach((p) => {
            removeActive(p);
            openedDirectory.delete(p.toString());
        });
    };

    const refreshItem = (pathStr: string) => {
        r.refreshPath(createPath(pathStr, null));
    };

    readDirectory("").then((rootItems) => {
        const rootPaths = rootItems.map(({ name, isDirectory }) =>
            createPath(name, isDirectory),
        );
        r.addPaths(rootPaths);
    });

    return {
        container,
        addItem,
        removeItem,
        refreshItem,
        getActiveItems: () => activePaths
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

function createFileItemElement(path: Path, opts: RenderOpts) {
    const depth = path.components.length - 1;
    const element = document.createElement("div");
    element.classList.add("file-item");

    if (opts.isActive(path)) {
        element.classList.add("active");
    }

    const customClasses = opts.classes(path);
    if (customClasses) {
        element.classList.add(...customClasses);
    }

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

    const prefix = opts.prefix(path);
    if (prefix) {
        const iconContainer = document.createElement("div");
        iconContainer.classList.add("prefix");
        iconContainer.append(prefix);
        element.append(iconContainer);
    }

    const name = document.createElement("div");
    name.append(opts.name(path.components.at(-1)))
    element.append(name);

    if (opts.onClick) {
        element.onclick = (e) => {
            e.stopPropagation();
            opts.onClick(path, e);
        };
    }

    const suffix = opts.suffix(path);
    if (suffix) {
        const action = document.createElement("div");
        action.classList.add("suffix");
        action.append(suffix);
        element.append(action);
    }

    return element;
}
