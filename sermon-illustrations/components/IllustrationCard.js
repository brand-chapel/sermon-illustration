import Image from 'next/image'
import styles from './IllustrationCard.module.css'

export default function IllustrationCard({ result, onSave, onRemove, isSaved }) {
  const fmt = n => n >= 1000 ? `${(n/1000).toFixed(0)}k` : n

  return (
    <div className={styles.card}>
      <a href={result.url} target="_blank" rel="noopener noreferrer" className={styles.thumb}>
        <Image src={result.thumbnail} alt={result.title} width={320} height={180} className={styles.img} />
        <span className={styles.play}>▶</span>
      </a>

      <div className={styles.body}>
        <div className={styles.badges}>
          {result.type && <span className={`${styles.badge} ${styles.badgeType}`}>{result.type}</span>}
          {result.theme && <span className={`${styles.badge} ${styles.badgeTheme}`}>{result.theme}</span>}
          {result.passage && <span className={`${styles.badge} ${styles.badgePassage}`}>{result.passage}</span>}
        </div>

        <h3 className={styles.title}>{result.title}</h3>
        <p className={styles.channel}>{result.channel} · {fmt(result.viewCount)} views</p>

        {result.summary && <p className={styles.summary}>{result.summary}</p>}

        {result.keyPoint && (
          <div className={styles.keyPoint}>
            <span className={styles.keyLabel}>Key point</span>
            <span>{result.keyPoint}</span>
          </div>
        )}

        {result.prop && (
          <p className={styles.prop}>Prop: <strong>{result.prop}</strong></p>
        )}

        <div className={styles.scores}>
          <div className={styles.scoreRow}>
            <span className={styles.scoreLabel}>Impact</span>
            <div className={styles.track}>
              <div className={styles.fillImpact} style={{ width: `${result.impact}%` }} />
            </div>
            <span className={styles.scoreNum}>{result.impact}%</span>
          </div>
          <div className={styles.scoreRow}>
            <span className={styles.scoreLabel}>Reusability</span>
            <div className={styles.track}>
              <div className={styles.fillReuse} style={{ width: `${result.reusability}%` }} />
            </div>
            <span className={styles.scoreNum}>{result.reusability}%</span>
          </div>
        </div>

        <div className={styles.footer}>
          <a href={result.url} target="_blank" rel="noopener noreferrer" className={styles.watchBtn}>
            Watch clip ↗
          </a>
          {onSave && !isSaved && (
            <button className={styles.saveBtn} onClick={() => onSave(result)}>Save</button>
          )}
          {onRemove && (
            <button className={`${styles.saveBtn} ${styles.removeBtn}`} onClick={() => onRemove(result.videoId)}>Remove</button>
          )}
          {isSaved && !onRemove && (
            <span className={styles.savedTag}>Saved</span>
          )}
        </div>
      </div>
    </div>
  )
}
