export function TagRow({ items }: { items: string[] }) {
    return (
        <ul className="tag-row">
            {items.map((item) => (
                <li key={item} className="tag">
                    {item}
                </li>
            ))}
        </ul>
    )
}
