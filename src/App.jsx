import { useState } from 'react'

function App() {
  const [word, setWord] = useState('')
  const [meaning, setMeaning] = useState('')
  const [wordList, setWordList] = useState([])

  const handleAdd = () => {
    if (!word || !meaning) {
      alert('请输入完整内容')
      return
    }

    const newWord = {
      id: Date.now(),
      word,
      meaning,
    }

    setWordList([...wordList, newWord])

    setWord('')
    setMeaning('')
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'Arial' }}>
      <h1>单词管理系统</h1>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="请输入英文单词"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          style={{
            width: '200px',
            height: '35px',
            marginRight: '10px',
            paddingLeft: '10px',
          }}
        />

        <input
          type="text"
          placeholder="请输入中文意思"
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          style={{
            width: '200px',
            height: '35px',
            marginRight: '10px',
            paddingLeft: '10px',
          }}
        />

        <button
          onClick={handleAdd}
          style={{
            height: '40px',
            padding: '0 20px',
            cursor: 'pointer',
          }}
        >
          Add
        </button>
      </div>

      <div>
        <h2>单词列表</h2>

        {wordList.length === 0 ? (
          <p>暂无数据</p>
        ) : (
          <table border="1" cellPadding="10">
            <thead>
              <tr>
                <th>英文单词</th>
                <th>中文意思</th>
              </tr>
            </thead>

            <tbody>
              {wordList.map((item) => (
                <tr key={item.id}>
                  <td>{item.word}</td>
                  <td>{item.meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default App